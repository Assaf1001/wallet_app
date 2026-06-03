import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import type { SwaggerConfig } from '../config/config.interface';

export function setupSwagger(app: INestApplication): void {
  const configService = app.get(ConfigService);
  const swaggerConfig = configService.get<SwaggerConfig>('swagger', {
    infer: true,
  });

  if (!swaggerConfig?.enabled) {
    return;
  }

  const config = new DocumentBuilder()
    .setTitle(swaggerConfig.title)
    .setDescription(swaggerConfig.description)
    .setVersion(swaggerConfig.version)
    .addTag('merchants')
    .addTag('wallets')
    .addTag('transactions')
    .addTag('ledger')
    .build();

  const document = SwaggerModule.createDocument(app as any, config);
  SwaggerModule.setup(swaggerConfig.path, app as any, document, {
    useGlobalPrefix: true,
  });
}
