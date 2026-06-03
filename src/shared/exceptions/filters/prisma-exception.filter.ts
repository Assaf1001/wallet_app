import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import { Prisma } from '../../../generated/prisma/client';
import { buildErrorResponse } from '../utils/build-error-response';

type PrismaException =
  | Prisma.PrismaClientKnownRequestError
  | Prisma.PrismaClientValidationError
  | Prisma.PrismaClientUnknownRequestError
  | Prisma.PrismaClientRustPanicError
  | Prisma.PrismaClientInitializationError;

@Catch(
  Prisma.PrismaClientKnownRequestError,
  Prisma.PrismaClientValidationError,
  Prisma.PrismaClientUnknownRequestError,
  Prisma.PrismaClientRustPanicError,
  Prisma.PrismaClientInitializationError,
)
export class PrismaExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(PrismaExceptionFilter.name);

  catch(exception: PrismaException, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest();

    const { status, message, code, details } = this.mapException(exception);

    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(
        `${request.method} ${request.url} - Prisma ${'code' in exception ? exception.code : 'error'}: ${exception.message}`,
        exception.stack,
      );
    }

    response.status(status).json(buildErrorResponse(status, message, code, details));
  }

  private mapException(exception: PrismaException): {
    status: number;
    message: string;
    code: string;
    details?: Record<string, unknown>;
  } {
    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      return this.mapKnownRequestError(exception);
    }

    if (exception instanceof Prisma.PrismaClientValidationError) {
      return {
        status: HttpStatus.BAD_REQUEST,
        message: 'Invalid database query',
        code: 'INVALID_DATABASE_QUERY',
      };
    }

    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Database error',
      code: 'DATABASE_ERROR',
    };
  }

  private mapKnownRequestError(
    exception: Prisma.PrismaClientKnownRequestError,
  ): { status: number; message: string; code: string; details?: Record<string, unknown> } {
    const details =
      exception.meta && Object.keys(exception.meta).length > 0
        ? { meta: exception.meta }
        : undefined;

    switch (exception.code) {
      case 'P2002':
        return {
          status: HttpStatus.CONFLICT,
          message: 'A record with this value already exists',
          code: 'DUPLICATE_RECORD',
          details,
        };
      case 'P2025':
        return {
          status: HttpStatus.NOT_FOUND,
          message: 'Record not found',
          code: 'RECORD_NOT_FOUND',
          details,
        };
      case 'P2003':
        return {
          status: HttpStatus.BAD_REQUEST,
          message: 'Related record does not exist',
          code: 'RELATED_RECORD_NOT_FOUND',
          details,
        };
      case 'P2014':
        return {
          status: HttpStatus.BAD_REQUEST,
          message: 'The change would violate a required relation',
          code: 'RELATION_VIOLATION',
          details,
        };
      default:
        return {
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Database error',
          code: `PRISMA_${exception.code}`,
          details,
        };
    }
  }
}
