import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service.js';
import { AuditService } from '../audit/audit.service.js';
import { ConflictApiError, NotFoundApiError } from '../common/errors/api-error.js';
import type { AuthenticatedUser } from '../common/interfaces/authenticated-request.interface.js';
import type { CreateClientDto } from './dto/create-client.dto.js';
import type { UpdateClientDto } from './dto/update-client.dto.js';
import type { ListClientsDto } from './dto/list-clients.dto.js';
import type { CreateClientContactDto, UpdateClientContactDto } from './dto/client-contact.dto.js';
import type { CreateClientServiceDto, UpdateClientServiceDto } from './dto/client-service.dto.js';

async function nextClientCode(prisma: PrismaService, organizationId: string): Promise<string> {
  const count = await prisma.client.count({ where: { organizationId } });
  return `CL-${(count + 1).toString().padStart(4, '0')}`;
}

@Injectable()
export class ClientsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async list(organizationId: string, query: ListClientsDto) {
    const where: Prisma.ClientWhereInput = {
      organizationId,
      deletedAt: null,
      ...(query.status ? { status: query.status } : {}),
      ...(query.assignedUserId ? { assignedUserId: query.assignedUserId } : {}),
      ...(query.search
        ? {
            OR: [
              { displayName: { contains: query.search, mode: 'insensitive' } },
              { legalName: { contains: query.search, mode: 'insensitive' } },
              { clientCode: { contains: query.search, mode: 'insensitive' } },
              { pan: { contains: query.search, mode: 'insensitive' } },
              { gstin: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const sortDir = query.sortDir ?? 'desc';
    const orderBy: Prisma.ClientOrderByWithRelationInput =
      query.sortBy === 'taskCount'
        ? { tasks: { _count: sortDir } }
        : query.sortBy === 'displayName'
          ? { displayName: sortDir }
          : query.sortBy === 'status'
            ? { status: sortDir }
            : { createdAt: sortDir };

    const [items, total] = await Promise.all([
      this.prisma.client.findMany({
        where,
        orderBy,
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        include: {
          assignedUser: { select: { id: true, fullName: true } },
          services: { select: { category: true }, take: 6, orderBy: { createdAt: 'desc' } },
          _count: { select: { services: true, tasks: true } },
        },
      }),
      this.prisma.client.count({ where }),
    ]);

    return { items, total, page: query.page, pageSize: query.pageSize };
  }

  /** Always scope by organizationId in the WHERE clause, then 404 (not 403) if absent — never confirm cross-tenant existence. */
  private async findOwned(organizationId: string, id: string) {
    const client = await this.prisma.client.findFirst({
      where: { id, organizationId, deletedAt: null },
      include: {
        assignedUser: { select: { id: true, fullName: true } },
        createdBy: { select: { id: true, fullName: true } },
        contacts: { orderBy: { isPrimary: 'desc' } },
        services: { orderBy: { createdAt: 'desc' } },
      },
    });
    if (!client) {
      throw new NotFoundApiError('CLIENT_NOT_FOUND', 'This client could not be found.');
    }
    return client;
  }

  async get(organizationId: string, id: string) {
    return this.findOwned(organizationId, id);
  }

  async create(user: AuthenticatedUser, dto: CreateClientDto) {
    for (let attempt = 0; attempt < 3; attempt++) {
      const clientCode = await nextClientCode(this.prisma, user.organizationId);
      try {
        const client = await this.prisma.$transaction(async (tx) => {
          const created = await tx.client.create({
            data: {
              organizationId: user.organizationId,
              clientCode,
              createdByUserId: user.id,
              displayName: dto.displayName,
              legalName: dto.legalName,
              businessType: dto.businessType,
              pan: dto.pan,
              gstin: dto.gstin,
              tan: dto.tan,
              cinOrLlpin: dto.cinOrLlpin,
              email: dto.email,
              phone: dto.phone,
              addressLine1: dto.addressLine1,
              addressLine2: dto.addressLine2,
              city: dto.city,
              state: dto.state,
              pincode: dto.pincode,
              assignedUserId: dto.assignedUserId,
              notes: dto.notes,
            },
          });
          await this.audit.log(
            {
              organizationId: user.organizationId,
              userId: user.id,
              action: 'client_created',
              entityType: 'client',
              entityId: created.id,
              after: created,
            },
            tx,
          );
          return created;
        });
        return this.findOwned(user.organizationId, client.id);
      } catch (err) {
        if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
          const target = (err.meta?.target as string[] | undefined) ?? [];
          if (target.includes('clientCode')) continue; // race on auto-generated code — retry
          if (target.includes('pan')) {
            throw new ConflictApiError('PAN_IN_USE', 'Another client already uses this PAN.');
          }
          if (target.includes('gstin')) {
            throw new ConflictApiError('GSTIN_IN_USE', 'Another client already uses this GSTIN.');
          }
        }
        throw err;
      }
    }
    throw new ConflictApiError('CLIENT_CODE_CONFLICT', 'Could not allocate a client code. Please retry.');
  }

  async update(user: AuthenticatedUser, id: string, dto: UpdateClientDto) {
    const before = await this.findOwned(user.organizationId, id);
    try {
      await this.prisma.$transaction(async (tx) => {
        const after = await tx.client.update({ where: { id }, data: dto });
        await this.audit.log(
          {
            organizationId: user.organizationId,
            userId: user.id,
            action: 'client_updated',
            entityType: 'client',
            entityId: id,
            before,
            after,
          },
          tx,
        );
      });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        const target = (err.meta?.target as string[] | undefined) ?? [];
        if (target.includes('pan')) throw new ConflictApiError('PAN_IN_USE', 'Another client already uses this PAN.');
        if (target.includes('gstin'))
          throw new ConflictApiError('GSTIN_IN_USE', 'Another client already uses this GSTIN.');
      }
      throw err;
    }
    return this.findOwned(user.organizationId, id);
  }

  async archive(user: AuthenticatedUser, id: string) {
    const before = await this.findOwned(user.organizationId, id);
    await this.prisma.$transaction(async (tx) => {
      await tx.client.update({
        where: { id },
        data: { status: 'ARCHIVED', deletedAt: new Date() },
      });
      await this.audit.log(
        {
          organizationId: user.organizationId,
          userId: user.id,
          action: 'client_archived',
          entityType: 'client',
          entityId: id,
          before,
        },
        tx,
      );
    });
    return { message: 'Client archived.' };
  }

  // --- Contacts ---

  async addContact(user: AuthenticatedUser, clientId: string, dto: CreateClientContactDto) {
    await this.findOwned(user.organizationId, clientId);
    return this.prisma.clientContact.create({
      data: { clientId, organizationId: user.organizationId, ...dto },
    });
  }

  async updateContact(
    user: AuthenticatedUser,
    clientId: string,
    contactId: string,
    dto: UpdateClientContactDto,
  ) {
    await this.findOwned(user.organizationId, clientId);
    const contact = await this.prisma.clientContact.findFirst({
      where: { id: contactId, clientId, organizationId: user.organizationId },
    });
    if (!contact) throw new NotFoundApiError('CONTACT_NOT_FOUND', 'This contact could not be found.');
    return this.prisma.clientContact.update({ where: { id: contactId }, data: dto });
  }

  async removeContact(user: AuthenticatedUser, clientId: string, contactId: string) {
    await this.findOwned(user.organizationId, clientId);
    const contact = await this.prisma.clientContact.findFirst({
      where: { id: contactId, clientId, organizationId: user.organizationId },
    });
    if (!contact) throw new NotFoundApiError('CONTACT_NOT_FOUND', 'This contact could not be found.');
    await this.prisma.clientContact.delete({ where: { id: contactId } });
    return { message: 'Contact removed.' };
  }

  // --- Services ---

  async addService(user: AuthenticatedUser, clientId: string, dto: CreateClientServiceDto) {
    await this.findOwned(user.organizationId, clientId);
    return this.prisma.clientService.create({
      data: {
        clientId,
        organizationId: user.organizationId,
        category: dto.category,
        name: dto.name,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
        status: dto.status,
        notes: dto.notes,
      },
    });
  }

  async updateService(
    user: AuthenticatedUser,
    clientId: string,
    serviceId: string,
    dto: UpdateClientServiceDto,
  ) {
    await this.findOwned(user.organizationId, clientId);
    const service = await this.prisma.clientService.findFirst({
      where: { id: serviceId, clientId, organizationId: user.organizationId },
    });
    if (!service) throw new NotFoundApiError('SERVICE_NOT_FOUND', 'This service could not be found.');
    return this.prisma.clientService.update({
      where: { id: serviceId },
      data: {
        ...dto,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
      },
    });
  }

  async removeService(user: AuthenticatedUser, clientId: string, serviceId: string) {
    await this.findOwned(user.organizationId, clientId);
    const service = await this.prisma.clientService.findFirst({
      where: { id: serviceId, clientId, organizationId: user.organizationId },
    });
    if (!service) throw new NotFoundApiError('SERVICE_NOT_FOUND', 'This service could not be found.');
    await this.prisma.clientService.delete({ where: { id: serviceId } });
    return { message: 'Service removed.' };
  }
}
