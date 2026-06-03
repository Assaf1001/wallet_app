import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
} from '@nestjs/common';
import { Response } from 'express';
import {
  buildErrorResponse,
  extractExceptionCode,
  extractExceptionDetails,
  resolveExceptionMessage,
} from '../utils/build-error-response';

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const status = exception.getStatus();
    const exceptionResponse = exception.getResponse();
    const message = resolveExceptionMessage(exception, exception.message);
    const errorName =
      typeof exceptionResponse === 'object' &&
      exceptionResponse !== null &&
      'error' in exceptionResponse &&
      typeof (exceptionResponse as { error?: unknown }).error === 'string'
        ? (exceptionResponse as { error: string }).error
        : undefined;

    response.status(status).json(
      buildErrorResponse(
        status,
        message,
        extractExceptionCode(exceptionResponse, status, errorName),
        extractExceptionDetails(exceptionResponse, message),
      ),
    );
  }
}
