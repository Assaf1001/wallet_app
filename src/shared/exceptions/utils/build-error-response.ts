import { HttpException, HttpStatus } from '@nestjs/common';
import { ApiErrorBody, ApiErrorResponse } from '../interfaces/api-error-response.interface';

const HTTP_STATUS_TO_CODE: Partial<Record<HttpStatus, string>> = {
  [HttpStatus.BAD_REQUEST]: 'BAD_REQUEST',
  [HttpStatus.UNAUTHORIZED]: 'UNAUTHORIZED',
  [HttpStatus.FORBIDDEN]: 'FORBIDDEN',
  [HttpStatus.NOT_FOUND]: 'NOT_FOUND',
  [HttpStatus.CONFLICT]: 'CONFLICT',
  [HttpStatus.UNPROCESSABLE_ENTITY]: 'UNPROCESSABLE_ENTITY',
  [HttpStatus.INTERNAL_SERVER_ERROR]: 'INTERNAL_SERVER_ERROR',
};

export function statusToErrorCode(status: number, fallbackName?: string): string {
  const mapped = HTTP_STATUS_TO_CODE[status as HttpStatus];
  if (mapped) {
    return mapped;
  }
  if (fallbackName) {
    return fallbackName.toUpperCase().replace(/\s+/g, '_');
  }
  return 'UNKNOWN_ERROR';
}

export function resolveExceptionMessage(
  exception: unknown,
  fallbackMessage: string,
): string | string[] {
  if (exception instanceof HttpException) {
    const response = exception.getResponse();
    if (typeof response === 'string') {
      return response;
    }
    if (typeof response === 'object' && response !== null && 'message' in response) {
      const message = (response as { message?: string | string[] }).message;
      if (message !== undefined) {
        return message;
      }
    }
  }

  if (exception instanceof Error && exception.message) {
    return exception.message;
  }

  return fallbackMessage;
}

export function normalizeMessage(message: string | string[]): string {
  return Array.isArray(message) ? message.join('; ') : message;
}

export function extractExceptionDetails(
  exceptionResponse: string | object,
  message: string | string[],
): Record<string, unknown> | undefined {
  const details: Record<string, unknown> = {};

  if (Array.isArray(message)) {
    details.messages = message;
  }

  if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
    const customDetails = (exceptionResponse as { details?: unknown }).details;
    if (typeof customDetails === 'object' && customDetails !== null) {
      Object.assign(details, customDetails as Record<string, unknown>);
    }

    for (const [key, value] of Object.entries(exceptionResponse)) {
      if (!['statusCode', 'message', 'error', 'code', 'details'].includes(key)) {
        details[key] = value;
      }
    }
  }

  return Object.keys(details).length > 0 ? details : undefined;
}

export function extractExceptionCode(
  exceptionResponse: string | object,
  status: number,
  errorName?: string,
): string | undefined {
  if (typeof exceptionResponse === 'object' && exceptionResponse !== null && 'code' in exceptionResponse) {
    const code = (exceptionResponse as { code?: unknown }).code;
    if (typeof code === 'string') {
      return code;
    }
  }

  return errorName ? statusToErrorCode(status, errorName) : undefined;
}

export function buildErrorResponse(
  status: number,
  message: string | string[],
  code?: string,
  details?: Record<string, unknown>,
): ApiErrorResponse {
  const body: ApiErrorBody = {
    code: code ?? statusToErrorCode(status),
    message: normalizeMessage(message),
    status,
  };

  if (details !== undefined && Object.keys(details).length > 0) {
    body.details = details;
  }

  return { error: body };
}
