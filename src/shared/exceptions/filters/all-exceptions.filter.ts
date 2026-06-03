import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import { buildErrorResponse, resolveExceptionMessage } from '../utils/build-error-response';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest();
    const status = HttpStatus.INTERNAL_SERVER_ERROR;
    const message = resolveExceptionMessage(exception, 'Internal server error');

    this.logger.error(
      `${request.method} ${request.url} - ${status}: ${Array.isArray(message) ? message.join(', ') : message}`,
      exception instanceof Error ? exception.stack : undefined,
    );

    response
      .status(status)
      .json(buildErrorResponse(status, message, 'INTERNAL_SERVER_ERROR'));
  }
}
