import { randomBytes } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import * as argon2 from 'argon2';
import { PrismaService } from '../common/prisma/prisma.service.js';
import { AuditService } from '../audit/audit.service.js';
import { ConflictApiError, NotFoundApiError } from '../common/errors/api-error.js';
import { EmailService } from '../email/email.service.js';
import { ConfigService } from '@nestjs/config';
import { hashToken, RESET_TOKEN_BYTES, RESET_TOKEN_TTL_MINUTES } from '../auth/auth.service.js';
import type { AuthenticatedUser } from '../common/interfaces/authenticated-request.interface.js';
import type { InviteMemberDto } from './dto/invite-member.dto.js';
import type { UpdateMemberDto } from './dto/update-member.dto.js';

/** Never let a password hash reach an audit row, even hashed. */
function sanitizeUser<T extends { passwordHash?: unknown }>(user: T) {
  const { passwordHash: _passwordHash, ...rest } = user;
  return rest;
}

@Injectable()
export class TeamService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly email: EmailService,
    private readonly config: ConfigService,
    private readonly audit: AuditService,
  ) {}

  async listRoles() {
    return this.prisma.role.findMany({
      where: { key: { notIn: ['CLIENT'] } },
      select: { id: true, key: true, name: true, description: true },
      orderBy: { name: 'asc' },
    });
  }

  async summary(organizationId: string) {
    const [total, active, inactive, invited] = await Promise.all([
      this.prisma.user.count({ where: { organizationId, deletedAt: null } }),
      this.prisma.user.count({ where: { organizationId, deletedAt: null, status: 'ACTIVE' } }),
      this.prisma.user.count({ where: { organizationId, deletedAt: null, status: 'SUSPENDED' } }),
      this.prisma.user.count({ where: { organizationId, deletedAt: null, status: 'INVITED' } }),
    ]);
    return { total, active, inactive, pendingInvitations: invited };
  }

  /** Real workload per member, computed live from Task assignments — nothing pre-aggregated/stale. */
  async list(organizationId: string) {
    const members = await this.prisma.user.findMany({
      where: { organizationId, deletedAt: null },
      select: {
        id: true,
        fullName: true,
        email: true,
        status: true,
        lastLoginAt: true,
        role: { select: { key: true, name: true } },
        _count: { select: { assignedClients: true } },
      },
      orderBy: { fullName: 'asc' },
    });

    const taskCounts = await this.prisma.task.groupBy({
      by: ['assignedUserId', 'status'],
      where: { organizationId, deletedAt: null, assignedUserId: { not: null } },
      _count: true,
    });
    const overdueCounts = await this.prisma.task.groupBy({
      by: ['assignedUserId'],
      where: {
        organizationId,
        deletedAt: null,
        assignedUserId: { not: null },
        status: { in: ['PENDING', 'IN_PROGRESS', 'BLOCKED'] },
        dueDate: { lt: new Date() },
      },
      _count: true,
    });

    const byUser = new Map<string, { assigned: number; completed: number; pending: number }>();
    for (const row of taskCounts) {
      if (!row.assignedUserId) continue;
      const entry = byUser.get(row.assignedUserId) ?? { assigned: 0, completed: 0, pending: 0 };
      entry.assigned += row._count;
      if (row.status === 'COMPLETED') entry.completed += row._count;
      else if (row.status !== 'CANCELLED') entry.pending += row._count;
      byUser.set(row.assignedUserId, entry);
    }
    const overdueByUser = new Map(overdueCounts.map((r) => [r.assignedUserId as string, r._count]));

    return members.map((m) => {
      const w = byUser.get(m.id) ?? { assigned: 0, completed: 0, pending: 0 };
      const overdue = overdueByUser.get(m.id) ?? 0;
      return {
        id: m.id,
        fullName: m.fullName,
        email: m.email,
        status: m.status,
        role: m.role,
        lastLoginAt: m.lastLoginAt,
        assignedClients: m._count.assignedClients,
        workload: {
          assigned: w.assigned,
          completed: w.completed,
          pending: w.pending,
          overdue,
          completionPercent: w.assigned === 0 ? null : Math.round((w.completed / w.assigned) * 100),
        },
      };
    });
  }

  /**
   * Real invite flow, no fake "email sent" claim: creates the user
   * (status INVITED) and a genuine PasswordResetToken (the exact same
   * mechanism /auth/password-reset/confirm already consumes) — reusing
   * auth's set-password flow as the accept-invite flow. If no email
   * provider is configured, the raw token/link is returned to the caller
   * (dev-mode) so the admin can share it manually, same pattern as
   * forgot-password.
   */
  async invite(user: AuthenticatedUser, dto: InviteMemberDto) {
    const email = dto.email.toLowerCase();
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) throw new ConflictApiError('EMAIL_IN_USE', 'An account with this email already exists.');

    const role = await this.prisma.role.findUnique({ where: { key: dto.roleKey } });
    if (!role) throw new NotFoundApiError('ROLE_NOT_FOUND', 'This role does not exist.');

    // Unusable placeholder — the account cannot be logged into until the
    // invite is accepted and a real password is set via the token below.
    const placeholderHash = await argon2.hash(randomBytes(32).toString('hex'), { type: argon2.argon2id });

    const { newUser, token } = await this.prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          organizationId: user.organizationId,
          roleId: role.id,
          email,
          passwordHash: placeholderHash,
          fullName: dto.fullName,
          status: 'INVITED',
        },
      });
      const token = randomBytes(RESET_TOKEN_BYTES).toString('base64url');
      await tx.passwordResetToken.create({
        data: {
          userId: newUser.id,
          tokenHash: hashToken(token),
          expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MINUTES * 60 * 1000),
        },
      });
      await this.audit.log(
        {
          organizationId: user.organizationId,
          userId: user.id,
          action: 'team_member_invited',
          entityType: 'user',
          entityId: newUser.id,
          after: sanitizeUser(newUser),
          metadata: { email, roleKey: dto.roleKey },
        },
        tx,
      );
      return { newUser, token };
    });

    const sendResult = await this.email.send({
      to: email,
      subject: `You've been invited to a CA SmartPro workspace`,
      body: `Set your password to accept the invite (valid ${RESET_TOKEN_TTL_MINUTES} minutes): ${token}`,
    });

    const devEcho =
      this.config.get<string>('nodeEnv') === 'development' && !sendResult.delivered ? { devOnlyInviteToken: token } : {};

    return {
      id: newUser.id,
      email: newUser.email,
      fullName: newUser.fullName,
      status: newUser.status,
      message: sendResult.delivered ? 'Invitation sent.' : 'Invitation created — email delivery is not configured.',
      ...devEcho,
    };
  }

  async updateMember(user: AuthenticatedUser, memberId: string, dto: UpdateMemberDto) {
    const member = await this.prisma.user.findFirst({ where: { id: memberId, organizationId: user.organizationId, deletedAt: null } });
    if (!member) throw new NotFoundApiError('MEMBER_NOT_FOUND', 'This team member could not be found.');

    let roleId: string | undefined;
    if (dto.roleKey) {
      const role = await this.prisma.role.findUnique({ where: { key: dto.roleKey } });
      if (!role) throw new NotFoundApiError('ROLE_NOT_FOUND', 'This role does not exist.');
      roleId = role.id;
    }

    await this.prisma.$transaction(async (tx) => {
      const updated = await tx.user.update({ where: { id: memberId }, data: { roleId, status: dto.status } });
      if (dto.status === 'SUSPENDED') {
        await tx.refreshSession.updateMany({ where: { userId: memberId, revokedAt: null }, data: { revokedAt: new Date() } });
      }
      await this.audit.log(
        {
          organizationId: user.organizationId,
          userId: user.id,
          action: 'team_member_updated',
          entityType: 'user',
          entityId: memberId,
          before: sanitizeUser(member),
          after: sanitizeUser(updated),
          metadata: { roleKey: dto.roleKey, status: dto.status },
        },
        tx,
      );
    });

    return { message: 'Team member updated.' };
  }
}
