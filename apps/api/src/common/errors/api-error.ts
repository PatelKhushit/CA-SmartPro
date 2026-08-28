import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * Throw this for any domain-level error so the response always matches the
 * standard { success: false, error: { code, message } } shape instead of
 * leaking Nest's default exception structure or internal details.
 */
export class ApiError extends HttpException {
  constructor(
    public readonly code: string,
    message: string,
    status: HttpStatus = HttpStatus.BAD_REQUEST,
  ) {
    super({ code, message }, status);
  }
}

export class NotFoundApiError extends ApiError {
  constructor(code: string, message: string) {
    super(code, message, HttpStatus.NOT_FOUND);
  }
}

export class ForbiddenApiError extends ApiError {
  constructor(code: string, message: string) {
    super(code, message, HttpStatus.FORBIDDEN);
  }
}

export class ConflictApiError extends ApiError {
  constructor(code: string, message: string) {
    super(code, message, HttpStatus.CONFLICT);
  }
}

export class UnauthorizedApiError extends ApiError {
  constructor(code: string, message: string) {
    super(code, message, HttpStatus.UNAUTHORIZED);
  }
}
