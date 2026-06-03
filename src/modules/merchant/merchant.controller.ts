import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { MerchantStatus } from '../../generated/prisma/client';
import { CreateMerchantDto } from './dto/create-merchant.dto';
import { UpdateMerchantStatusDto } from './dto/update-merchant-status.dto';
import { MerchantIdParamDto } from './dto/merchant-id.param.dto';
import { buildModuleHealthResponse } from '../../shared/health';
import { MerchantService } from './merchant.service';

@ApiTags('merchants')
@Controller('merchants')
export class MerchantController {
  constructor(private readonly merchantService: MerchantService) {}

  @Post()
  @ApiOperation({ summary: 'Create a merchant' })
  @ApiCreatedResponse({ description: 'Merchant created' })
  create(@Body() dto: CreateMerchantDto) {
    return this.merchantService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List merchants' })
  @ApiOkResponse({ description: 'List of merchants' })
  findAll(@Query('status') status?: MerchantStatus) {
    return this.merchantService.findAll(
      status !== undefined ? { status } : undefined,
    );
  }

  @Get('health')
  @ApiOperation({ summary: 'Merchant module health check' })
  @ApiOkResponse({ description: 'Merchant module is healthy' })
  health() {
    return buildModuleHealthResponse('merchant');
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get merchant by id' })
  @ApiOkResponse({ description: 'Merchant found' })
  findOne(@Param() params: MerchantIdParamDto) {
    return this.merchantService.findById(params.id);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Change merchant status' })
  @ApiOkResponse({ description: 'Merchant status updated' })
  updateStatus(
    @Param() params: MerchantIdParamDto,
    @Body() dto: UpdateMerchantStatusDto,
  ) {
    return this.merchantService.updateStatus(params.id, dto.status);
  }
}
