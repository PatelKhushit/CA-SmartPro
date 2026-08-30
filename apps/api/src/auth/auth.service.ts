import { randomBytes, createHash } from 'node:crypto';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService, type JwtSignOptions } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { PrismaService } from '../common/prisma/prisma.service.js';
import { ConflictApiError, UnauthorizedApiError } from '../common/errors/api-error.js';
import { EmailService } from '../email/email.service.js';
import type { RegisterDto } from './dto/register.dto.js';
import type { LoginDto } from './dto/login.dto.js';

const REFRESH_TOKEN_BYTES = 48;
export const RESET_TOKEN_BYTES = 32;
const MAX_FAILED_LOGINS = 5;
const LOCKOUT_MINUTES = 15;
// Exported so TeamService can issue a "set your password" link with the same
// TTL when inviting a team member — it's the same token flow either way.
export const RESET_TOKEN_TTL_MINUTES = 30;

export interface SessionMeta {
  userAgent?: string;
  ipAddress?: string;
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 60);
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly email: EmailService,
  ) {}

  private async issueAccessToken(userId: string, organizationId: string) {
    const signOptions: JwtSignOptions = {
      secret: this.config.getOrThrow<string>('auth.accessSecret'),
      expiresIn: this.config.getOrThrow<string>('auth.accessTtl') as JwtSignOptions['expiresIn'],
    };
    return this.jwt.signAsync({ sub: userId, orgId: organizationId }, signOptions);
  }

  private async issueRefreshSession(userId: string, organizationId: string, meta: SessionMeta) {
    const refreshToken = randomBytes(REFRESH_TOKEN_BYTES).toString('base64url');
    const refreshTtlDays = this.config.get<number>('auth.refreshTtlDays') ?? 30;
    const expiresAt = new Date(Date.now() + refreshTtlDays * 24 * 60 * 60 * 1000);

    await this.prisma.refreshSession.create({
      data: {
        userId,
        organizationId,
        tokenHash: hashToken(refreshToken),
        userAgent: meta.userAgent,
        ipAddress: meta.ipAddress,
        expiresAt,
      },
    });

    return { refreshToken, expiresAt };
  }

  async register(dto: RegisterDto, meta: SessionMeta) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email.toLowerCase() } });
    if (existing) {
      throw new ConflictApiError('EMAIL_IN_USE', 'An account with this email already exists.');
    }

    const firmAdminRole = await this.prisma.role.findUniqueOrThrow({ where: { key: 'FIRM_ADMIN' } });

    const baseSlug = slugify(dto.firmName) || 'firm';
    let slug = baseSlug;
    let suffix = 1;
    while (await this.prisma.organization.findUnique({ where: { slug } })) {
      slug = `${baseSlug}-${++suffix}`;
    }

    const passwordHash = await argon2.hash(dto.password, { type: argon2.argon2id });

    const { organization, user } = await this.prisma.$transaction(async (tx) => {
      const organization = await tx.organization.create({
        data: { name: dto.firmName, slug },
      });
      const user = await tx.user.create({
        data: {
          organizationId: organization.id,
          roleId: firmAdminRole.id,
          email: dto.email.toLowerCase(),
          passwordHash,
          fullName: dto.fullName,
        },
      });
      await tx.auditLog.create({
        data: {
          organizationId: organization.id,
          userId: user.id,
          action: 'organization_created',
          entityType: 'organization',
          entityId: organization.id,
          ipAddress: meta.ipAddress,
        },
      });
      return { organization, user };
    });

    void this.email.send({
      to: user.email,
      subject: 'Welcome to CA SmartPro',
      body: `Hi ${user.fullName}, your firm workspace "${organization.name}" is ready.`,
    });

    const accessToken = await this.issueAccessToken(user.id, organization.id);
    const { refreshToken, expiresAt } = await this.issueRefreshSession(user.id, organization.id, meta);

    return {
      accessToken,
      refreshToken,
      refreshExpiresAt: expiresAt,
      user: await this.serializeUser(user.id),
    };
  }

  async login(dto: LoginDto, meta: SessionMeta) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email.toLowerCase() } });

    // Constant-shaped response whether or not the account exists, to avoid
    // user enumeration via timing/response differences.
    const genericError = () =>
      new UnauthorizedApiError('INVALID_CREDENTIALS', 'Invalid email or password.');

    if (!user || user.deletedAt) {
      await argon2.hash('dummy-value-to-equalize-timing', { type: argon2.argon2id });
      throw genericError();
    }

    if (user.lockedUntil && user.lockedUntil > new Date()) {
      throw new UnauthorizedApiError(
        'ACCOUNT_LOCKED',
        `Too many failed attempts. Try again after ${user.lockedUntil.toLocaleTimeString()}.`,
      );
    }

    if (user.status !== 'ACTIVE') {
      throw genericError();
    }

    const valid = await argon2.verify(user.passwordHash, dto.password);
    if (!valid) {
      const failedLoginCount = user.failedLoginCount + 1;
      const lockedUntil =
        failedLoginCount >= MAX_FAILED_LOGINS
          ? new Date(Date.now() + LOCKOUT_MINUTES * 60 * 1000)
          : null;
      await this.prisma.user.update({
        where: { id: user.id },
        data: { failedLoginCount, lockedUntil },
      });
      throw genericError();
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { failedLoginCount: 0, lockedUntil: null, lastLoginAt: new Date() },
    });

    await this.prisma.auditLog.create({
      data: {
        organizationId: user.organizationId,
        userId: user.id,
        action: 'login',
        entityType: 'user',
        entityId: user.id,
        ipAddress: meta.ipAddress,
      },
    });

    const accessToken = await this.issueAccessToken(user.id, user.organizationId);
    const { refreshToken, expiresAt } = await this.issueRefreshSession(
      user.id,
      user.organizationId,
      meta,
    );

    return {
      accessToken,
      refreshToken,
      refreshExpiresAt: expiresAt,
      user: await this.serializeUser(user.id),
    };
  }

  async refresh(rawRefreshToken: string, meta: SessionMeta) {
    if (!rawRefreshToken) {
      throw new UnauthorizedApiError('NO_SESSION', 'No active session.');
    }

    const tokenHash = hashToken(rawRefreshToken);
    const session = await this.prisma.refreshSession.findUnique({ where: { tokenHash } });

    if (!session || session.revokedAt || session.expiresAt < new Date()) {
      throw new UnauthorizedApiError('SESSION_EXPIRED', 'Your session has expired. Please sign in again.');
    }

    const rotated = await this.prisma.$transaction(async (tx) => {
      const next = await this.issueRefreshSession(session.userId, session.organizationId, meta);
      await tx.refreshSession.update({
        where: { id: session.id },
        data: { revokedAt: new Date() },
      });
      return next;
    });

    const accessToken = await this.issueAccessToken(session.userId, session.organizationId);

    return {
      accessToken,
      refreshToken: rotated.refreshToken,
      refreshExpiresAt: rotated.expiresAt,
      user: await this.serializeUser(session.userId),
    };
  }

  async logout(rawRefreshToken: string | undefined) {
    if (!rawRefreshToken) return;
    const tokenHash = hashToken(rawRefreshToken);
    const session = await this.prisma.refreshSession.findUnique({ where: { tokenHash } });
    await this.prisma.refreshSession.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    if (session) {
      await this.prisma.auditLog.create({
        data: {
          organizationId: session.organizationId,
          userId: session.userId,
          action: 'logout',
          entityType: 'user',
          entityId: session.userId,
        },
      });
    }
  }

  async logoutAllSessions(userId: string) {
    await this.prisma.refreshSession.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async requestPasswordReset(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    // Always behave the same way regardless of whether the account exists.
    if (!user || user.deletedAt || user.status !== 'ACTIVE') {
      return { message: 'If that email exists, a reset link has been sent.' };
    }

    const token = randomBytes(RESET_TOKEN_BYTES).toString('base64url');
    await this.prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash: hashToken(token),
        expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MINUTES * 60 * 1000),
      },
    });

    const sendResult = await this.email.send({
      to: user.email,
      subject: 'Reset your CA SmartPro password',
      body: `Use this token to reset your password (valid ${RESET_TOKEN_TTL_MINUTES} minutes): ${token}`,
    });

    const devEcho =
      this.config.get<string>('nodeEnv') === 'development' && !sendResult.delivered
        ? { devOnlyResetToken: token }
        : {};

    return { message: 'If that email exists, a reset link has been sent.', ...devEcho };
  }

  async confirmPasswordReset(rawToken: string, newPassword: string) {
    const tokenHash = hashToken(rawToken);
    const resetToken = await this.prisma.passwordResetToken.findUnique({ where: { tokenHash } });

    if (!resetToken || resetToken.usedAt || resetToken.expiresAt < new Date()) {
      throw new UnauthorizedApiError('INVALID_RESET_TOKEN', 'This reset link is invalid or has expired.');
    }

    const passwordHash = await argon2.hash(newPassword, { type: argon2.argon2id });

    await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.findUniqueOrThrow({ where: { id: resetToken.userId }, select: { status: true } });
      await tx.user.update({
        where: { id: resetToken.userId },
        data: {
          passwordHash,
          failedLoginCount: 0,
          lockedUntil: null,
          // This same token/confirm flow doubles as "accept invite" (see
          // TeamService.invite) — an INVITED user setting their password for
          // the first time becomes ACTIVE. No-op for an existing ACTIVE user.
          status: user.status === 'INVITED' ? 'ACTIVE' : undefined,
        },
      });
      await tx.passwordResetToken.update({
        where: { id: resetToken.id },
        data: { usedAt: new Date() },
      });
      await tx.refreshSession.updateMany({
        where: { userId: resetToken.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    });

    return { message: 'Password updated. Please sign in again.' };
  }

  async serializeUser(userId: string) {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      include: {
        organization: true,
        role: { include: { rolePermissions: { include: { permission: true } } } },
      },
    });

    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: { key: user.role.key, name: user.role.name },
      permissions: user.role.rolePermissions.map((rp) => rp.permission.key),
      organization: { id: user.organization.id, name: user.organization.name, slug: user.organization.slug },
    };
  }
}
