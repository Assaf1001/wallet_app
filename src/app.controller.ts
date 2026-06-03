import { Controller, Get, Redirect } from '@nestjs/common';
import { ApiOkResponse, ApiOperation } from '@nestjs/swagger';
import { swaggerUiUrl } from './config/api-paths';
import { buildModuleHealthResponse } from './shared/health';

@Controller()
export class AppController {
  @Get()
  @Redirect(swaggerUiUrl(), 302)
  @ApiOperation({ summary: 'API documentation' })
  @ApiOkResponse({ description: 'Redirects to Swagger UI' })
  docs() {}

  @Get('health')
  @ApiOperation({ summary: 'Application health check' })
  @ApiOkResponse({ description: 'Application is healthy' })
  health() {
    return buildModuleHealthResponse('api');
  }
}
