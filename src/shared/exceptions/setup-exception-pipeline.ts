import { INestApplication } from '@nestjs/common';
import { AllExceptionsFilter } from './filters/all-exceptions.filter';
import { HttpExceptionFilter } from './filters/http-exception.filter';
import { PrismaExceptionFilter } from './filters/prisma-exception.filter';

/**
 * Registers global exception filters in pipeline order.
 * Nest consults the last-registered filter first; specific handlers run before the catch-all.
 */
export function setupExceptionPipeline(app: INestApplication): void {
  app.useGlobalFilters(
    new AllExceptionsFilter(),
    new HttpExceptionFilter(),
    new PrismaExceptionFilter(),
  );
}
