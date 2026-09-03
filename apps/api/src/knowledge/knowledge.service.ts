import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenAI } from '@google/genai';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service.js';
import { AuditService } from '../audit/audit.service.js';
import { ApiError, NotFoundApiError } from '../common/errors/api-error.js';
import type { AuthenticatedUser } from '../common/interfaces/authenticated-request.interface.js';
import type { CreateKnowledgeDocumentDto, ListKnowledgeDocumentsDto, UpdateKnowledgeDocumentDto } from './dto/knowledge-document.dto.js';

const DOCUMENT_INCLUDE = {
  createdBy: { select: { id: true, fullName: true } },
  _count: { select: { chunks: true } },
} satisfies Prisma.KnowledgeDocumentInclude;

const CHUNK_SIZE = 800;
const CHUNK_OVERLAP = 100;

/** Splits text into overlapping chunks, preferring paragraph/sentence boundaries near the target size. */
function chunkText(text: string): string[] {
  const cleaned = text.trim().replace(/\r\n/g, '\n');
  if (cleaned.length <= CHUNK_SIZE) return [cleaned];

  const chunks: string[] = [];
  let start = 0;
  while (start < cleaned.length) {
    let end = Math.min(start + CHUNK_SIZE, cleaned.length);
    if (end < cleaned.length) {
      const minBoundary = start + CHUNK_SIZE * 0.5;
      const paraBreak = cleaned.lastIndexOf('\n\n', end);
      const sentenceBreak = cleaned.lastIndexOf('. ', end);
      if (paraBreak > minBoundary) end = paraBreak;
      else if (sentenceBreak > minBoundary) end = sentenceBreak + 1;
    }
    const chunk = cleaned.slice(start, end).trim();
    if (chunk.length > 0) chunks.push(chunk);
    start = end >= cleaned.length ? end : end - CHUNK_OVERLAP;
  }
  return chunks;
}

function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

@Injectable()
export class KnowledgeService {
  private readonly logger = new Logger(KnowledgeService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly config: ConfigService,
  ) {}

  /** Real embeddings via the Gemini embedding API — never a fabricated/random vector. */
  private async embedTexts(texts: string[]): Promise<number[][]> {
    const apiKey = this.config.get<string>('ai.apiKey');
    if (!apiKey) {
      throw new ApiError('AI_NOT_CONFIGURED', 'AI is not configured in this environment (AI_API_KEY is not set), so the knowledge base cannot generate embeddings.');
    }
    const genAI = new GoogleGenAI({ apiKey });
    const model = this.config.get<string>('ai.embeddingModel') || 'text-embedding-004';
    const response = await genAI.models.embedContent({ model, contents: texts });
    if (!response.embeddings || response.embeddings.length !== texts.length) {
      throw new ApiError('EMBEDDING_FAILED', 'The embedding provider returned an unexpected response.');
    }
    return response.embeddings.map((e) => {
      if (!e.values || e.values.length === 0) throw new ApiError('EMBEDDING_FAILED', 'The embedding provider returned an empty vector.');
      return e.values;
    });
  }

  async list(organizationId: string, query: ListKnowledgeDocumentsDto) {
    const where: Prisma.KnowledgeDocumentWhereInput = {
      organizationId,
      ...(query.search
        ? { OR: [{ title: { contains: query.search, mode: 'insensitive' } }, { content: { contains: query.search, mode: 'insensitive' } }] }
        : {}),
    };
    const [items, total] = await Promise.all([
      this.prisma.knowledgeDocument.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        include: DOCUMENT_INCLUDE,
      }),
      this.prisma.knowledgeDocument.count({ where }),
    ]);
    return { items, total, page: query.page, pageSize: query.pageSize };
  }

  private async findOwned(organizationId: string, id: string) {
    const doc = await this.prisma.knowledgeDocument.findFirst({
      where: { id, organizationId },
      include: { ...DOCUMENT_INCLUDE, chunks: { orderBy: { chunkIndex: 'asc' }, select: { id: true, chunkIndex: true, content: true } } },
    });
    if (!doc) throw new NotFoundApiError('KNOWLEDGE_DOCUMENT_NOT_FOUND', 'This knowledge document could not be found.');
    return doc;
  }

  async get(organizationId: string, id: string) {
    return this.findOwned(organizationId, id);
  }

  async create(user: AuthenticatedUser, dto: CreateKnowledgeDocumentDto) {
    const doc = await this.prisma.knowledgeDocument.create({
      data: { organizationId: user.organizationId, title: dto.title, content: dto.content, status: 'PROCESSING', createdByUserId: user.id },
    });
    await this.audit.log({
      organizationId: user.organizationId,
      userId: user.id,
      action: 'knowledge_document_created',
      entityType: 'knowledge_document',
      entityId: doc.id,
      after: doc,
    });
    await this.processDocument(user, doc.id, dto.content);
    return this.findOwned(user.organizationId, doc.id);
  }

  /** Chunks + embeds the content, then flips the document to READY or FAILED. Runs synchronously within the request — fine at foundation scale; a real background job (this app already uses BullMQ elsewhere) would be the next step at higher document volume/size. */
  private async processDocument(user: AuthenticatedUser, documentId: string, content: string) {
    const chunks = chunkText(content);
    try {
      const embeddings = await this.embedTexts(chunks);
      await this.prisma.$transaction(async (tx) => {
        await tx.knowledgeChunk.deleteMany({ where: { knowledgeDocumentId: documentId } });
        await tx.knowledgeChunk.createMany({
          data: chunks.map((chunkContent, i) => ({
            organizationId: user.organizationId,
            knowledgeDocumentId: documentId,
            chunkIndex: i,
            content: chunkContent,
            embedding: embeddings[i],
          })),
        });
        await tx.knowledgeDocument.update({ where: { id: documentId }, data: { status: 'READY', errorMessage: null } });
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error while generating embeddings.';
      this.logger.error(`Knowledge document ${documentId} failed to embed: ${message}`);
      await this.prisma.knowledgeDocument.update({ where: { id: documentId }, data: { status: 'FAILED', errorMessage: message } });
    }
  }

  async update(user: AuthenticatedUser, id: string, dto: UpdateKnowledgeDocumentDto) {
    const existing = await this.findOwned(user.organizationId, id);
    const contentChanged = dto.content !== undefined && dto.content !== existing.content;

    await this.prisma.$transaction(async (tx) => {
      const after = await tx.knowledgeDocument.update({
        where: { id },
        data: { title: dto.title, content: dto.content, status: contentChanged ? 'PROCESSING' : undefined },
      });
      await this.audit.log(
        { organizationId: user.organizationId, userId: user.id, action: 'knowledge_document_updated', entityType: 'knowledge_document', entityId: id, before: existing, after },
        tx,
      );
    });

    if (contentChanged && dto.content) {
      await this.processDocument(user, id, dto.content);
    }
    return this.findOwned(user.organizationId, id);
  }

  async remove(user: AuthenticatedUser, id: string) {
    const existing = await this.findOwned(user.organizationId, id);
    await this.prisma.$transaction(async (tx) => {
      await tx.knowledgeDocument.delete({ where: { id } });
      await this.audit.log(
        { organizationId: user.organizationId, userId: user.id, action: 'knowledge_document_deleted', entityType: 'knowledge_document', entityId: id, before: existing },
        tx,
      );
    });
    return { message: 'Knowledge document deleted.' };
  }

  /** Real semantic search: embeds the query, then ranks every READY chunk in the org by cosine similarity. */
  async search(organizationId: string, query: string, topK = 5) {
    const chunks = await this.prisma.knowledgeChunk.findMany({
      where: { organizationId, knowledgeDocument: { status: 'READY' } },
      select: { content: true, embedding: true, knowledgeDocument: { select: { id: true, title: true } } },
    });
    if (chunks.length === 0) return { results: [] };

    const [queryEmbedding] = await this.embedTexts([query]);
    const results = chunks
      .map((c) => ({
        documentId: c.knowledgeDocument.id,
        documentTitle: c.knowledgeDocument.title,
        content: c.content,
        score: Math.round(cosineSimilarity(queryEmbedding, c.embedding) * 1000) / 1000,
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);

    return { results };
  }
}
