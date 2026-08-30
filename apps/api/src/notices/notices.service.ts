import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service.js';
import { NotFoundApiError } from '../common/errors/api-error.js';
import type { AuthenticatedUser } from '../common/interfaces/authenticated-request.interface.js';
import type { CreateNoticeDto } from './dto/create-notice.dto.js';
import type { UpdateNoticeDto } from './dto/update-notice.dto.js';
import type { ListNoticesDto } from './dto/list-notices.dto.js';
import type { AddNoticeCommentDto, CreateNoticeTaskDto, LinkNoticeDocumentDto } from './dto/misc.dto.js';

const NOTICE_INCLUDE = {
  client: { select: { id: true, displayName: true, clientCode: true } },
  assignedUser: { select: { id: true, fullName: true } },
  createdBy: { select: { id: true, fullName: true } },
  comments: { include: { user: { select: { id: true, fullName: true } } }, orderBy: { createdAt: 'asc' } },
  documents: { include: { document: { select: { id: true, title: true, category: true } } } },
  tasks: { select: { id: true, title: true, status: true, dueDate: true } },
} satisfies Prisma.NoticeInclude;

@Injectable()
export class NoticesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(organizationId: string, query: ListNoticesDto) {
    const where: Prisma.NoticeWhereInput = {
      organizationId,
      ...(query.clientId ? { clientId: query.clientId } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.department ? { department: query.department } : {}),
      ...(query.assignedUserId ? { assignedUserId: query.assignedUserId } : {}),
      ...(query.search
        ? {
            OR: [
              { referenceNumber: { contains: query.search, mode: 'insensitive' } },
              { noticeType: { contains: query.search, mode: 'insensitive' } },
              { client: { displayName: { contains: query.search, mode: 'insensitive' } } },
            ],
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.notice.findMany({
        where,
        orderBy: [{ responseDeadline: 'asc' }, { createdAt: 'desc' }],
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        include: {
          client: { select: { id: true, displayName: true, clientCode: true } },
          assignedUser: { select: { id: true, fullName: true } },
          _count: { select: { comments: true, documents: true } },
        },
      }),
      this.prisma.notice.count({ where }),
    ]);

    return { items, total, page: query.page, pageSize: query.pageSize };
  }

  /** Dashboard counts by status, for the Notices dashboard and the Tax & Compliance overview. */
  async summary(organizationId: string) {
    const rows = await this.prisma.notice.groupBy({
      by: ['status'],
      where: { organizationId },
      _count: true,
    });
    const counts = Object.fromEntries(rows.map((r) => [r.status, r._count]));
    return {
      new: counts.NEW ?? 0,
      underReview: counts.UNDER_REVIEW ?? 0,
      drafting: counts.DRAFTING ?? 0,
      waitingForClient: counts.WAITING_FOR_CLIENT ?? 0,
      readyToSubmit: counts.READY_TO_SUBMIT ?? 0,
      submitted: counts.SUBMITTED ?? 0,
      closed: counts.CLOSED ?? 0,
      overdue: counts.OVERDUE ?? 0,
    };
  }

  private async findOwned(organizationId: string, id: string) {
    const notice = await this.prisma.notice.findFirst({
      where: { id, organizationId },
      include: NOTICE_INCLUDE,
    });
    if (!notice) throw new NotFoundApiError('NOTICE_NOT_FOUND', 'This notice could not be found.');
    return notice;
  }

  async get(organizationId: string, id: string) {
    return this.findOwned(organizationId, id);
  }

  async create(user: AuthenticatedUser, dto: CreateNoticeDto) {
    const client = await this.prisma.client.findFirst({
      where: { id: dto.clientId, organizationId: user.organizationId, deletedAt: null },
      select: { id: true },
    });
    if (!client) throw new NotFoundApiError('CLIENT_NOT_FOUND', 'This client could not be found.');

    const created = await this.prisma.$transaction(async (tx) => {
      const notice = await tx.notice.create({
        data: {
          organizationId: user.organizationId,
          clientId: dto.clientId,
          department: dto.department,
          noticeType: dto.noticeType,
          referenceNumber: dto.referenceNumber,
          noticeDate: new Date(dto.noticeDate),
          responseDeadline: dto.responseDeadline ? new Date(dto.responseDeadline) : undefined,
          assignedUserId: dto.assignedUserId,
          priority: dto.priority,
          description: dto.description,
          createdByUserId: user.id,
        },
      });
      await tx.auditLog.create({
        data: {
          organizationId: user.organizationId,
          userId: user.id,
          action: 'notice_created',
          entityType: 'notice',
          entityId: notice.id,
          metadata: { referenceNumber: notice.referenceNumber, noticeType: notice.noticeType },
        },
      });
      return notice;
    });

    return this.findOwned(user.organizationId, created.id);
  }

  async update(user: AuthenticatedUser, id: string, dto: UpdateNoticeDto) {
    const existing = await this.findOwned(user.organizationId, id);
    const closing = dto.status === 'CLOSED' && existing.status !== 'CLOSED';

    await this.prisma.$transaction(async (tx) => {
      await tx.notice.update({
        where: { id },
        data: {
          department: dto.department,
          noticeType: dto.noticeType,
          referenceNumber: dto.referenceNumber,
          noticeDate: dto.noticeDate ? new Date(dto.noticeDate) : undefined,
          responseDeadline: dto.responseDeadline ? new Date(dto.responseDeadline) : undefined,
          assignedUserId: dto.assignedUserId,
          priority: dto.priority,
          status: dto.status,
          description: dto.description,
          closedAt: closing ? new Date() : undefined,
        },
      });
      if (dto.status && dto.status !== existing.status) {
        await tx.auditLog.create({
          data: {
            organizationId: user.organizationId,
            userId: user.id,
            action: 'notice_status_changed',
            entityType: 'notice',
            entityId: id,
            metadata: { from: existing.status, to: dto.status },
          },
        });
      }
    });

    return this.findOwned(user.organizationId, id);
  }

  async addComment(user: AuthenticatedUser, id: string, dto: AddNoticeCommentDto) {
    await this.findOwned(user.organizationId, id);
    await this.prisma.noticeComment.create({
      data: { noticeId: id, organizationId: user.organizationId, userId: user.id, body: dto.body },
    });
    return this.findOwned(user.organizationId, id);
  }

  async linkDocument(user: AuthenticatedUser, id: string, dto: LinkNoticeDocumentDto) {
    const notice = await this.findOwned(user.organizationId, id);
    const document = await this.prisma.document.findFirst({
      where: { id: dto.documentId, organizationId: user.organizationId, deletedAt: null },
      select: { id: true, clientId: true },
    });
    if (!document) throw new NotFoundApiError('DOCUMENT_NOT_FOUND', 'This document could not be found.');
    if (document.clientId !== notice.clientId) {
      throw new NotFoundApiError('DOCUMENT_CLIENT_MISMATCH', 'This document belongs to a different client.');
    }

    await this.prisma.noticeDocument.upsert({
      where: { noticeId_documentId: { noticeId: id, documentId: dto.documentId } },
      update: {},
      create: { noticeId: id, organizationId: user.organizationId, documentId: dto.documentId },
    });
    return this.findOwned(user.organizationId, id);
  }

  async unlinkDocument(user: AuthenticatedUser, id: string, documentId: string) {
    await this.findOwned(user.organizationId, id);
    await this.prisma.noticeDocument.deleteMany({
      where: { noticeId: id, documentId, organizationId: user.organizationId },
    });
    return this.findOwned(user.organizationId, id);
  }

  /** Creates a real Task linked back to this notice — not a mocked "task created" toast. */
  async createTask(user: AuthenticatedUser, id: string, dto: CreateNoticeTaskDto) {
    const notice = await this.findOwned(user.organizationId, id);

    await this.prisma.$transaction(async (tx) => {
      const task = await tx.task.create({
        data: {
          organizationId: user.organizationId,
          clientId: notice.clientId,
          noticeId: id,
          title: dto.title,
          category: 'CLIENT_SPECIFIC',
          priority: notice.priority,
          assignedUserId: dto.assignedUserId,
          dueDate: dto.dueDate ? new Date(dto.dueDate) : notice.responseDeadline,
          createdByUserId: user.id,
        },
      });
      await tx.auditLog.create({
        data: {
          organizationId: user.organizationId,
          userId: user.id,
          action: 'notice_task_created',
          entityType: 'notice',
          entityId: id,
          metadata: { taskId: task.id },
        },
      });
    });

    return this.findOwned(user.organizationId, id);
  }
}
