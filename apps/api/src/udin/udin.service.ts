import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service.js';
import { ApiError, ConflictApiError, NotFoundApiError } from '../common/errors/api-error.js';
import type { AuthenticatedUser } from '../common/interfaces/authenticated-request.interface.js';
import type { CreateUdinDto } from './dto/create-udin.dto.js';
import type { UpdateUdinDto } from './dto/update-udin.dto.js';
import type { ListUdinDto } from './dto/list-udin.dto.js';

const UDIN_INCLUDE = {
  client: { select: { id: true, displayName: true, clientCode: true } },
  assignedUser: { select: { id: true, fullName: true } },
  createdBy: { select: { id: true, fullName: true } },
} satisfies Prisma.UDINRecordInclude;

@Injectable()
export class UdinService {
  constructor(private readonly prisma: PrismaService) {}

  async list(organizationId: string, query: ListUdinDto) {
    const where: Prisma.UDINRecordWhereInput = {
      organizationId,
      ...(query.clientId ? { clientId: query.clientId } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.documentType ? { documentType: query.documentType } : {}),
      ...(query.search
        ? {
            OR: [
              { udinNumber: { contains: query.search, mode: 'insensitive' } },
              { description: { contains: query.search, mode: 'insensitive' } },
              { client: { displayName: { contains: query.search, mode: 'insensitive' } } },
            ],
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.uDINRecord.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        include: UDIN_INCLUDE,
      }),
      this.prisma.uDINRecord.count({ where }),
    ]);

    return { items, total, page: query.page, pageSize: query.pageSize };
  }

  async summary(organizationId: string) {
    const rows = await this.prisma.uDINRecord.groupBy({ by: ['status'], where: { organizationId }, _count: true });
    const counts = Object.fromEntries(rows.map((r) => [r.status, r._count]));
    return {
      pending: counts.PENDING ?? 0,
      generated: counts.GENERATED ?? 0,
      verified: counts.VERIFIED ?? 0,
      expired: counts.EXPIRED ?? 0,
    };
  }

  private async findOwned(organizationId: string, id: string) {
    const record = await this.prisma.uDINRecord.findFirst({ where: { id, organizationId }, include: UDIN_INCLUDE });
    if (!record) throw new NotFoundApiError('UDIN_NOT_FOUND', 'This UDIN record could not be found.');
    return record;
  }

  async get(organizationId: string, id: string) {
    return this.findOwned(organizationId, id);
  }

  async create(user: AuthenticatedUser, dto: CreateUdinDto) {
    const client = await this.prisma.client.findFirst({
      where: { id: dto.clientId, organizationId: user.organizationId, deletedAt: null },
      select: { id: true },
    });
    if (!client) throw new NotFoundApiError('CLIENT_NOT_FOUND', 'This client could not be found.');

    const created = await this.prisma.$transaction(async (tx) => {
      const record = await tx.uDINRecord.create({
        data: {
          organizationId: user.organizationId,
          clientId: dto.clientId,
          documentType: dto.documentType,
          documentDate: new Date(dto.documentDate),
          description: dto.description,
          assignedUserId: dto.assignedUserId,
          notes: dto.notes,
          createdByUserId: user.id,
        },
      });
      await tx.auditLog.create({
        data: {
          organizationId: user.organizationId,
          userId: user.id,
          action: 'udin_record_created',
          entityType: 'udin_record',
          entityId: record.id,
        },
      });
      return record;
    });

    return this.findOwned(user.organizationId, created.id);
  }

  /** "Copy" action from the spec — duplicates a record as a fresh PENDING entry (e.g. for a similar certificate next period). */
  async copy(user: AuthenticatedUser, id: string) {
    const source = await this.findOwned(user.organizationId, id);
    const created = await this.prisma.uDINRecord.create({
      data: {
        organizationId: user.organizationId,
        clientId: source.clientId,
        documentType: source.documentType,
        documentDate: source.documentDate,
        description: source.description,
        assignedUserId: source.assignedUserId,
        createdByUserId: user.id,
      },
    });
    return this.findOwned(user.organizationId, created.id);
  }

  async update(user: AuthenticatedUser, id: string, dto: UpdateUdinDto) {
    await this.findOwned(user.organizationId, id);

    if (dto.status === 'VERIFIED' && !dto.udinNumber) {
      const existing = await this.prisma.uDINRecord.findUnique({ where: { id }, select: { udinNumber: true } });
      if (!existing?.udinNumber) {
        throw new ApiError('UDIN_REQUIRED_TO_VERIFY', 'Enter the UDIN number before marking this verified.');
      }
    }

    try {
      await this.prisma.$transaction(async (tx) => {
        await tx.uDINRecord.update({
          where: { id },
          data: {
            documentType: dto.documentType,
            documentDate: dto.documentDate ? new Date(dto.documentDate) : undefined,
            description: dto.description,
            udinNumber: dto.udinNumber,
            generatedDate: dto.udinNumber && !dto.generatedDate ? new Date() : dto.generatedDate ? new Date(dto.generatedDate) : undefined,
            status: dto.status ?? (dto.udinNumber ? 'GENERATED' : undefined),
            assignedUserId: dto.assignedUserId,
            notes: dto.notes,
          },
        });
        await tx.auditLog.create({
          data: {
            organizationId: user.organizationId,
            userId: user.id,
            action: 'udin_record_updated',
            entityType: 'udin_record',
            entityId: id,
          },
        });
      });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new ConflictApiError('UDIN_IN_USE', 'This UDIN number is already recorded for another entry.');
      }
      throw err;
    }

    return this.findOwned(user.organizationId, id);
  }
}
