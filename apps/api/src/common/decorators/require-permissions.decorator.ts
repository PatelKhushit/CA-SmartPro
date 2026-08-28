import { SetMetadata } from '@nestjs/common';

export const PERMISSIONS_KEY = 'requiredPermissions';

/**
 * Declares which permission keys (e.g. "clients.view") a route requires.
 * Enforced server-side by PermissionsGuard — this is the actual authorization
 * boundary. Frontend button/route hiding is UX only, never a security control.
 */
export const RequirePermissions = (...permissions: string[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);
