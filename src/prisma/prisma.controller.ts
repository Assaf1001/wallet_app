import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { buildModuleHealthResponse } from '../shared/health';
import { PrismaService } from './prisma.service';

@ApiTags('prisma')
@Controller('prisma')
export class PrismaController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('health')
  @ApiOperation({ summary: 'Prisma module health check' })
  @ApiOkResponse({ description: 'Database connection is healthy' })
  async health() {
    await this.prisma.$queryRaw`SELECT 1`;
    return buildModuleHealthResponse('prisma');
  }
}
