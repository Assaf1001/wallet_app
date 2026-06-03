import { HttpException, HttpStatus } from '@nestjs/common';

export class DomainException extends HttpException {
  constructor(
    message: string,
    status: HttpStatus = HttpStatus.BAD_REQUEST,
    code?: string,
    details?: Record<string, unknown>,
  ) {
    super(
      {
        message,
        ...(code !== undefined ? { code } : {}),
        ...(details !== undefined ? { details } : {}),
      },
      status,
    );
  }
}
