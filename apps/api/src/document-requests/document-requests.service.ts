import { Injectable } from '@nestjs/common';
import { DocumentRequestItemStatus, DocumentRequestStatus, Prisma, ServiceCategory } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service.js';
import { AuditService } from '../audit/audit.service.js';
import { ApiError, NotFoundApiError } from '../common/errors/api-error.js';
import type { AuthenticatedUser } from '../common/interfaces/authenticated-request.interface.js';
import { DOCUMENT_REQUEST_TEMPLATES } from './document-request-templates.js';
import type { CreateDocumentRequestDto } from './dto/create-document-request.dto.js';
import type { UpdateDocumentRequestDto } from './dto/update-document-request.dto.js';
import type { ListDocumentRequestsDto } from './dto/list-document-requests.dto.js';
import type { AddDocumentRequestItemDto } from './dto/add-item.dto.js';
import type { FulfillDocumentRequestItemDto } from './dto/fulfill-item.dto.js';
import type { ReviewDocumentRequestItemDto } from './dto/review-item.dto.js';

const ITEM_INCLUDE = {
  document: { select: { id: true, title: true, category: true } },
} satisfies Prisma.DocumentRequestItemInclude;

const REQUEST_INCLUDE = {
  client: { select: { id: true, displayName: true } },
  createdBy: { select: { id: true, fullName: true } },
  items: { include: ITEM_INCLUDE, orderBy: { createdAt: 'asc' } },
} satisfies Prisma.DocumentRequestInclude;

function computeStatus(items: Array<{ isRequired: boolean; status: DocumentRequestItemStatus }>): DocumentRequestStatus {
  if (items.length === 0) return 'PENDING';
  const relevant = items.some((i) => i.isRequired) ? items.filter((i) => i.isRequired) : items;
  const done = relevant.filter((i) => i.status === 'UPLOADED' || i.status === 'APPROVED');
  if (done.length === relevant.length) return 'FULFILLED';
  if (done.length > 0) return 'PARTIAL';
  return 'PENDING';
}

@Injectable()
export class DocumentRequestsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  getTemplates(category?: ServiceCategory) {
    if (category) {
      return { category, items: DOCUMENT_REQUEST_TEMPLATES[category] ?? [] };
    }
    return { templates: DOCUMENT_REQUEST_TEMPLATES };
  }

  async list(organizationId: string, query: ListDocumentRequestsDto) {
    const where: Prisma.DocumentRequestWhereInput = {
      organizationId,
      ...(query.clientId ? { clientId: query.clientId } : {}),
      ...(query.status ? { status: query.status } : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.documentRequest.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        include: REQUEST_INCLUDE,
      }),
      this.prisma.documentRequest.count({ where }),
    ]);

    return { items, total, page: query.page, pageSize: query.pageSize };
  }

  private async findOwned(organizationId: string, id: string) {
    const request = await this.prisma.documentRequest.findFirst({
      where: { id, organizationId },
      include: REQUEST_INCLUDE,
    });
    if (!request) {
      throw new NotFoundApiError('DOCUMENT_REQUEST_NOT_FOUND', 'This document request could not be found.');
    }
    return request;
  }

  async get(organizationId: string, id: string) {
    return this.findOwned(organizationId, id);
  }

  async create(user: AuthenticatedUser, dto: CreateDocumentRequestDto) {
    const client = await this.prisma.client.findFirst({
      where: { id: dto.clientId, organizationId: user.organizationId, deletedAt: null },
      select: { id: true },
    });
    if (!client) throw new NotFoundApiError('CLIENT_NOT_FOUND', 'This client could not be found.');

    const created = await this.prisma.$transaction(async (tx) => {
      const request = await tx.documentRequest.create({
        data: {
          organizationId: user.organizationId,
          clientId: dto.clientId,
          title: dto.title,
          description: dto.description,
          dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
          createdByUserId: user.id,
        },
      });
      if (dto.items?.length) {
        await tx.documentRequestItem.createMany({
          data: dto.items.map((item) => ({
            documentRequestId: request.id,
            organizationId: user.organizationId,
            label: item.label,
            isRequired: item.isRequired ?? true,
          })),
        });
      }
      await this.audit.log(
        {
          organizationId: user.organizationId,
          userId: user.id,
          action: 'document_request_created',
          entityType: 'document_request',
          entityId: request.id,
          after: request,
          metadata: { title: request.title, itemCount: dto.items?.length ?? 0 },
        },
        tx,
      );
      return request;
    });

    return this.findOwned(user.organizationId, created.id);
  }

  async update(user: AuthenticatedUser, id: string, dto: UpdateDocumentRequestDto) {
    await this.findOwned(user.organizationId, id);
    await this.prisma.documentRequest.update({
      where: { id },
      data: {
        title: dto.title,
        description: dto.description,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
      },
    });
    return this.findOwned(user.organizationId, id);
  }

  async cancel(user: AuthenticatedUser, id: string) {
    const before = await this.findOwned(user.organizationId, id);
    await this.prisma.$transaction(async (tx) => {
      await tx.documentRequest.update({ where: { id }, data: { status: 'CANCELLED' } });
      await this.audit.log(
        {
          organizationId: user.organizationId,
          userId: user.id,
          action: 'document_request_cancelled',
          entityType: 'document_request',
          entityId: id,
          before,
        },
        tx,
      );
    });
    return this.findOwned(user.organizationId, id);
  }

  private async recomputeStatus(tx: Prisma.TransactionClient, requestId: string) {
    const request = await tx.documentRequest.findUniqueOrThrow({
      where: { id: requestId },
      include: { items: { select: { isRequired: true, status: true } } },
    });
    if (request.status === 'CANCELLED') return;
    const nextStatus = computeStatus(request.items);
    if (nextStatus !== request.status) {
      await tx.documentRequest.update({ where: { id: requestId }, data: { status: nextStatus } });
    }
  }

  async addItem(user: AuthenticatedUser, requestId: string, dto: AddDocumentRequestItemDto) {
    await this.findOwned(user.organizationId, requestId);
    await this.prisma.$transaction(async (tx) => {
      await tx.documentRequestItem.create({
        data: {
          documentRequestId: requestId,
          organizationId: user.organizationId,
          label: dto.label,
          isRequired: dto.isRequired ?? true,
        },
      });
      await this.recomputeStatus(tx, requestId);
    });
    return this.findOwned(user.organizationId, requestId);
  }

  async removeItem(user: AuthenticatedUser, requestId: string, itemId: string) {
    await this.findOwned(user.organizationId, requestId);
    const item = await this.prisma.documentRequestItem.findFirst({
      where: { id: itemId, documentRequestId: requestId, organizationId: user.organizationId },
    });
    if (!item) throw new NotFoundApiError('ITEM_NOT_FOUND', 'This checklist item could not be found.');
    await this.prisma.$transaction(async (tx) => {
      await tx.documentRequestItem.delete({ where: { id: itemId } });
      await this.recomputeStatus(tx, requestId);
    });
    return this.findOwned(user.organizationId, requestId);
  }

  /** Attaches an already-uploaded document to a checklist item and marks it UPLOADED. */
  async fulfillItem(user: AuthenticatedUser, requestId: string, itemId: string, dto: FulfillDocumentRequestItemDto) {
    const request = await this.findOwned(user.organizationId, requestId);
    const item = request.items.find((i) => i.id === itemId);
    if (!item) throw new NotFoundApiError('ITEM_NOT_FOUND', 'This checklist item could not be found.');

    const document = await this.prisma.document.findFirst({
      where: { id: dto.documentId, organizationId: user.organizationId, deletedAt: null },
      select: { id: true, clientId: true },
    });
    if (!document) throw new NotFoundApiError('DOCUMENT_NOT_FOUND', 'This document could not be found.');
    if (document.clientId !== request.clientId) {
      throw new ApiError('DOCUMENT_CLIENT_MISMATCH', 'This document belongs to a different client.');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.documentRequestItem.update({
        where: { id: itemId },
        data: { status: 'UPLOADED', documentId: dto.documentId },
      });
      await this.recomputeStatus(tx, requestId);
      await this.audit.log(
        {
          organizationId: user.organizationId,
          userId: user.id,
          action: 'document_request_item_fulfilled',
          entityType: 'document_request',
          entityId: requestId,
          before: item,
          metadata: { itemId, documentId: dto.documentId },
        },
        tx,
      );
    });

    return this.findOwned(user.organizationId, requestId);
  }

  /** Manager/accountant review action: approve/reject/reset a checklist item. */
  async reviewItem(user: AuthenticatedUser, requestId: string, itemId: string, dto: ReviewDocumentRequestItemDto) {
    await this.findOwned(user.organizationId, requestId);
    if (dto.status === 'UPLOADED') {
      throw new ApiError('INVALID_STATUS', 'Use the fulfill action to attach a document instead.');
    }
    const item = await this.prisma.documentRequestItem.findFirst({
      where: { id: itemId, documentRequestId: requestId, organizationId: user.organizationId },
    });
    if (!item) throw new NotFoundApiError('ITEM_NOT_FOUND', 'This checklist item could not be found.');

    await this.prisma.$transaction(async (tx) => {
      await tx.documentRequestItem.update({
        where: { id: itemId },
        data: { status: dto.status, notes: dto.notes },
      });
      await this.recomputeStatus(tx, requestId);
      await this.audit.log(
        {
          organizationId: user.organizationId,
          userId: user.id,
          action: 'document_request_item_reviewed',
          entityType: 'document_request',
          entityId: requestId,
          before: { status: item.status },
          after: { status: dto.status },
          metadata: { itemId },
        },
        tx,
      );
    });

    return this.findOwned(user.organizationId, requestId);
  }
}
