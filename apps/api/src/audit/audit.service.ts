import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service.js';

export interface AuditLogInput {
  organizationId: string;
  userId?: string;
  action: string;
  entityType?: string;
  entityId?: string;
  /** Entity state before the change — omit for create/read/login-style events that have no "before". */
  before?: unknown;
  /** Entity state after the change — omit for delete/logout-style events that have no "after". */
  after?: unknown;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Prisma's Json fields reject raw Date/undefined/class-instance values at
 * runtime (they must be plain JSON) — callers pass whatever Prisma entity
 * they already have in hand (createdAt as a Date, etc.), so round-trip
 * through JSON here rather than making every call site remember to do it.
 */
function toJson(value: unknown): Prisma.InputJsonValue | undefined {
  if (value === undefined) return undefined;
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

/**
 * Single write path for every audit event in the app (spec section 29):
 * one row shape, one place that decides what gets recorded, so future
 * modules can't quietly under-audit by rolling their own prisma.auditLog.create.
 */
@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  /** Pass `tx` when logging inside an existing $transaction so the audit row commits atomically with the change it records. */
  log(input: AuditLogInput, tx?: Prisma.TransactionClient) {
    const client = tx ?? this.prisma;
    return client.auditLog.create({
      data: {
        organizationId: input.organizationId,
        userId: input.userId,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId,
        beforeValue: toJson(input.before),
        afterValue: toJson(input.after),
        metadata: toJson(input.metadata),
        ipAddress: input.ipAddress,
        userAgent: input.userAgent,
      },
    });
  }
}
