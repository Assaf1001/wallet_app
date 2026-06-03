import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { API_GLOBAL_PREFIX } from './config/api-paths';
import type { CorsConfig, NestConfig } from './config/config.interface';
import { setupExceptionPipeline } from './shared/exceptions';
import { setupSwagger } from './swagger/swagger.setup';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix(API_GLOBAL_PREFIX);

  const configService = app.get(ConfigService);
  const nestConfig = configService.get<NestConfig>('nest', { infer: true });
  const corsConfig = configService.get<CorsConfig>('cors', { infer: true });

  if (corsConfig?.enabled) {
    app.enableCors();
  }
  setupSwagger(app);
  setupExceptionPipeline(app);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  await app.listen(nestConfig?.port ?? 3000);
}
bootstrap();
