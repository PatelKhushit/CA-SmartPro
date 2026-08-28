import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../../common/prisma/prisma.service.js';
import type { AuthenticatedUser } from '../../common/interfaces/authenticated-request.interface.js';

export interface AccessTokenPayload {
  sub: string;
  orgId: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('auth.accessSecret'),
    });
  }

  /**
   * Re-derives the user/role/permissions from the database on every request
   * rather than trusting a cached JWT claim. This keeps permission or
   * suspension changes effective immediately instead of waiting out the
   * access-token TTL. (Perf optimization via caching is a Phase 2 TODO.)
   */
  async validate(payload: AccessTokenPayload): Promise<AuthenticatedUser> {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      include: { role: { include: { rolePermissions: { include: { permission: true } } } } },
    });

    if (!user || user.deletedAt || user.status !== 'ACTIVE') {
      throw new UnauthorizedException('Session is no longer valid.');
    }

    if (user.organizationId !== payload.orgId) {
      throw new UnauthorizedException('Session is no longer valid.');
    }

    return {
      id: user.id,
      organizationId: user.organizationId,
      roleKey: user.role.key,
      permissions: user.role.rolePermissions.map((rp) => rp.permission.key),
      email: user.email,
      fullName: user.fullName,
    };
  }
}
