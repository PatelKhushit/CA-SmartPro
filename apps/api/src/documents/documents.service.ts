import { createHash } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service.js';
import { ApiError, ForbiddenApiError, NotFoundApiError } from '../common/errors/api-error.js';
import type { AuthenticatedUser } from '../common/interfaces/authenticated-request.interface.js';
import { STORAGE_PROVIDER, type StorageProvider } from './storage/storage-provider.interface.js';
import { isAllowedUpload } from './storage/upload-validation.js';
import { createSignedDownloadToken, verifySignedDownloadToken } from './storage/signed-url.util.js';
import type { CreateDocumentDto } from './dto/create-document.dto.js';
import type { UpdateDocumentDto } from './dto/update-document.dto.js';
import type { ListDocumentsDto } from './dto/list-documents.dto.js';

@Injectable()
export class DocumentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    @Inject(STORAGE_PROVIDER) private readonly storage: StorageProvider,
  ) {}

  private get maxUploadBytes(): number {
    return (this.config.get<number>('storage.maxUploadMb') ?? 20) * 1024 * 1024;
  }

  async list(organizationId: string, query: ListDocumentsDto) {
    const where: Prisma.DocumentWhereInput = {
      organizationId,
      deletedAt: null,
      ...(query.clientId ? { clientId: query.clientId } : {}),
      ...(query.category ? { category: query.category } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.search ? { title: { contains: query.search, mode: 'insensitive' } } : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.document.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        include: {
          client: { select: { id: true, displayName: true } },
          uploadedBy: { select: { id: true, fullName: true } },
          versions: { orderBy: { versionNumber: 'desc' }, take: 1 },
          _count: { select: { versions: true } },
        },
      }),
      this.prisma.document.count({ where }),
    ]);

    return { items, total, page: query.page, pageSize: query.pageSize };
  }

  /** Always scope by organizationId, then 404 if absent — never confirm cross-tenant existence. */
  private async findOwned(organizationId: string, id: string) {
    const document = await this.prisma.document.findFirst({
      where: { id, organizationId, deletedAt: null },
      include: {
        client: { select: { id: true, displayName: true } },
        uploadedBy: { select: { id: true, fullName: true } },
        versions: { orderBy: { versionNumber: 'desc' } },
      },
    });
    if (!document) {
      throw new NotFoundApiError('DOCUMENT_NOT_FOUND', 'This document could not be found.');
    }
    return document;
  }

  async get(organizationId: string, id: string) {
    return this.findOwned(organizationId, id);
  }

  private validateFile(file?: Express.Multer.File) {
    if (!file) {
      throw new ApiError('FILE_REQUIRED', 'Please attach a file to upload.');
    }
    if (file.size > this.maxUploadBytes) {
      throw new ApiError(
        'FILE_TOO_LARGE',
        `Files must be ${this.config.get<number>('storage.maxUploadMb')}MB or smaller.`,
      );
    }
    if (!isAllowedUpload(file.mimetype, file.originalname)) {
      throw new ApiError('UNSUPPORTED_FILE_TYPE', 'This file type is not supported.');
    }
  }

  async create(user: AuthenticatedUser, dto: CreateDocumentDto, file?: Express.Multer.File) {
    this.validateFile(file);
    const uploaded = file!;

    if (dto.clientId) {
      const client = await this.prisma.client.findFirst({
        where: { id: dto.clientId, organizationId: user.organizationId, deletedAt: null },
        select: { id: true },
      });
      if (!client) throw new NotFoundApiError('CLIENT_NOT_FOUND', 'This client could not be found.');
    }

    const { storageKey } = await this.storage.putObject({
      organizationId: user.organizationId,
      buffer: uploaded.buffer,
      originalFilename: uploaded.originalname,
    });
    const checksumSha256 = createHash('sha256').update(uploaded.buffer).digest('hex');

    const document = await this.prisma.$transaction(async (tx) => {
      const created = await tx.document.create({
        data: {
          organizationId: user.organizationId,
          clientId: dto.clientId,
          category: dto.category,
          title: dto.title,
          description: dto.description,
          uploadedByUserId: user.id,
        },
      });
      await tx.documentVersion.create({
        data: {
          documentId: created.id,
          organizationId: user.organizationId,
          versionNumber: 1,
          storageKey,
          originalFilename: uploaded.originalname,
          mimeType: uploaded.mimetype,
          sizeBytes: uploaded.size,
          checksumSha256,
          uploadedByUserId: user.id,
        },
      });
      await tx.auditLog.create({
        data: {
          organizationId: user.organizationId,
          userId: user.id,
          action: 'document_uploaded',
          entityType: 'document',
          entityId: created.id,
          metadata: { title: created.title, filename: uploaded.originalname },
        },
      });
      return created;
    });

    return this.findOwned(user.organizationId, document.id);
  }

  async addVersion(user: AuthenticatedUser, documentId: string, file?: Express.Multer.File) {
    this.validateFile(file);
    const uploaded = file!;
    const document = await this.findOwned(user.organizationId, documentId);

    const { storageKey } = await this.storage.putObject({
      organizationId: user.organizationId,
      buffer: uploaded.buffer,
      originalFilename: uploaded.originalname,
    });
    const checksumSha256 = createHash('sha256').update(uploaded.buffer).digest('hex');
    const nextVersionNumber = (document.versions[0]?.versionNumber ?? 0) + 1;

    await this.prisma.$transaction(async (tx) => {
      await tx.documentVersion.create({
        data: {
          documentId,
          organizationId: user.organizationId,
          versionNumber: nextVersionNumber,
          storageKey,
          originalFilename: uploaded.originalname,
          mimeType: uploaded.mimetype,
          sizeBytes: uploaded.size,
          checksumSha256,
          uploadedByUserId: user.id,
        },
      });
      await tx.document.update({ where: { id: documentId }, data: { updatedAt: new Date() } });
      await tx.auditLog.create({
        data: {
          organizationId: user.organizationId,
          userId: user.id,
          action: 'document_version_uploaded',
          entityType: 'document',
          entityId: documentId,
          metadata: { versionNumber: nextVersionNumber, filename: uploaded.originalname },
        },
      });
    });

    return this.findOwned(user.organizationId, documentId);
  }

  async update(user: AuthenticatedUser, id: string, dto: UpdateDocumentDto) {
    await this.findOwned(user.organizationId, id);
    await this.prisma.document.update({ where: { id }, data: dto });
    return this.findOwned(user.organizationId, id);
  }

  async archive(user: AuthenticatedUser, id: string) {
    await this.findOwned(user.organizationId, id);
    await this.prisma.$transaction(async (tx) => {
      await tx.document.update({ where: { id }, data: { status: 'ARCHIVED', deletedAt: new Date() } });
      await tx.auditLog.create({
        data: {
          organizationId: user.organizationId,
          userId: user.id,
          action: 'document_archived',
          entityType: 'document',
          entityId: id,
        },
      });
    });
    return { message: 'Document archived.' };
  }

  /** Issues a short-lived signed download URL (see storage/signed-url.util.ts) and audit-logs the access grant. */
  async createDownloadLink(user: AuthenticatedUser, documentId: string, versionId: string) {
    const document = await this.findOwned(user.organizationId, documentId);
    const version = document.versions.find((v) => v.id === versionId);
    if (!version) {
      throw new NotFoundApiError('DOCUMENT_VERSION_NOT_FOUND', 'This document version could not be found.');
    }

    const ttlSeconds = this.config.get<number>('storage.signedUrlTtlSeconds') ?? 300;
    const exp = Math.floor(Date.now() / 1000) + ttlSeconds;
    const token = createSignedDownloadToken(
      { documentId, versionId, organizationId: user.organizationId, exp },
      this.config.get<string>('storage.signingSecret')!,
    );

    await this.prisma.auditLog.create({
      data: {
        organizationId: user.organizationId,
        userId: user.id,
        action: 'document_downloaded',
        entityType: 'document',
        entityId: documentId,
        metadata: { versionId, filename: version.originalFilename },
      },
    });

    return { token, expiresAt: new Date(exp * 1000).toISOString(), filename: version.originalFilename };
  }

  /** Verifies a signed token (used by the public file-serving route) and streams the underlying object. */
  async resolveSignedDownload(token: string) {
    const secret = this.config.get<string>('storage.signingSecret')!;
    const payload = verifySignedDownloadToken(token, secret);
    if (!payload) {
      throw new ForbiddenApiError('INVALID_OR_EXPIRED_LINK', 'This download link is invalid or has expired.');
    }

    const version = await this.prisma.documentVersion.findFirst({
      where: { id: payload.versionId, documentId: payload.documentId, organizationId: payload.organizationId },
    });
    if (!version) {
      throw new NotFoundApiError('DOCUMENT_VERSION_NOT_FOUND', 'This document version could not be found.');
    }

    const stream = await this.storage.getObjectStream(version.storageKey);
    return { stream, version };
  }
}
