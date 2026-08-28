import type { Request } from 'express';

export interface AuthenticatedUser {
  id: string;
  organizationId: string;
  roleKey: string;
  permissions: string[];
  email: string;
  fullName: string;
}

export interface AuthenticatedRequest extends Request {
  user: AuthenticatedUser;
}
