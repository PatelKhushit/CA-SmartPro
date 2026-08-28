import { describe, expect, it, vi } from 'vitest';
import type { ExecutionContext } from '@nestjs/common';
import type { Reflector } from '@nestjs/core';
import { PermissionsGuard } from './permissions.guard.js';

function makeContext(permissions: string[]): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ user: { permissions } }),
    }),
    getHandler: () => ({}),
    getClass: () => ({}),
  } as unknown as ExecutionContext;
}

describe('PermissionsGuard', () => {
  it('allows the request when no permissions are required', () => {
    const reflector = { getAllAndOverride: vi.fn().mockReturnValue(undefined) } as unknown as Reflector;
    const guard = new PermissionsGuard(reflector);
    expect(guard.canActivate(makeContext([]))).toBe(true);
  });

  it('allows the request when the user has every required permission', () => {
    const reflector = { getAllAndOverride: vi.fn().mockReturnValue(['clients.view', 'clients.edit']) } as unknown as Reflector;
    const guard = new PermissionsGuard(reflector);
    expect(guard.canActivate(makeContext(['clients.view', 'clients.edit', 'tasks.view']))).toBe(true);
  });

  it('rejects the request when the user is missing a required permission', () => {
    const reflector = { getAllAndOverride: vi.fn().mockReturnValue(['clients.delete']) } as unknown as Reflector;
    const guard = new PermissionsGuard(reflector);
    expect(() => guard.canActivate(makeContext(['clients.view']))).toThrow();
  });
});
