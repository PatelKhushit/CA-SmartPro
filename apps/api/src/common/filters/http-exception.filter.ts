import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Response } from 'express';

interface StandardErrorBody {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

/**
 * Every error response leaves the API in the shape:
 *   { success: false, error: { code, message } }
 * Stack traces, Prisma errors, and other internals are logged server-side
 * only and never included in the response body.
 */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('ExceptionFilter');

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let code = 'INTERNAL_ERROR';
    let message = 'Something went wrong on our end. Please try again.';
    let details: unknown;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const body = exception.getResponse();

      if (typeof body === 'string') {
        message = body;
        code = defaultCodeForStatus(status);
      } else if (typeof body === 'object' && body !== null) {
        const b = body as Record<string, unknown>;
        code = typeof b.code === 'string' ? b.code : defaultCodeForStatus(status);
        if (Array.isArray(b.message)) {
          // class-validator returns an array of human-readable messages
          message = b.message.join(' ');
          details = b.message;
        } else if (typeof b.message === 'string') {
          message = b.message;
        } else {
          message = defaultMessageForStatus(status);
        }
      }
    } else {
      // Unknown/unhandled error — never leak internals to the client.
      this.logger.error(
        exception instanceof Error ? exception.stack ?? exception.message : String(exception),
      );
    }

    if (status >= 500) {
      this.logger.error(`${status} ${code}: ${message}`);
    }

    const payload: StandardErrorBody = {
      success: false,
      error: { code, message, ...(details ? { details } : {}) },
    };

    response.status(status).json(payload);
  }
}

function defaultCodeForStatus(status: number): string {
  switch (status) {
    case HttpStatus.BAD_REQUEST:
      return 'BAD_REQUEST';
    case HttpStatus.UNAUTHORIZED:
      return 'UNAUTHORIZED';
    case HttpStatus.FORBIDDEN:
      return 'FORBIDDEN';
    case HttpStatus.NOT_FOUND:
      return 'NOT_FOUND';
    case HttpStatus.CONFLICT:
      return 'CONFLICT';
    case HttpStatus.TOO_MANY_REQUESTS:
      return 'RATE_LIMITED';
    default:
      return 'INTERNAL_ERROR';
  }
}

function defaultMessageForStatus(status: number): string {
  switch (status) {
    case HttpStatus.UNAUTHORIZED:
      return 'You need to sign in to continue.';
    case HttpStatus.FORBIDDEN:
      return 'You do not have permission to do that.';
    case HttpStatus.NOT_FOUND:
      return 'We could not find that.';
    case HttpStatus.TOO_MANY_REQUESTS:
      return 'Too many requests. Please slow down and try again shortly.';
    default:
      return 'Something went wrong on our end. Please try again.';
  }
}
