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
import { CreateWalletDto } from './dto/create-wallet.dto';
import { ListWalletsQueryDto } from './dto/list-wallets-query.dto';
import { UpdateWalletStatusDto } from './dto/update-wallet-status.dto';
import { WalletIdParamDto } from './dto/wallet-id.param.dto';
import { buildModuleHealthResponse } from '../../shared/health';
import { WalletService } from './wallet.service';

@ApiTags('wallets')
@Controller('wallets')
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  @Post()
  @ApiOperation({ summary: 'Create a wallet' })
  @ApiCreatedResponse({ description: 'Wallet created' })
  create(@Body() dto: CreateWalletDto) {
    return this.walletService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List wallets' })
  @ApiOkResponse({ description: 'List of wallets' })
  findAll(@Query() query: ListWalletsQueryDto) {
    const hasFilter =
      query.status !== undefined ||
      query.currency !== undefined ||
      query.identity !== undefined;

    return this.walletService.findAll(hasFilter ? query : undefined);
  }

  @Get('health')
  @ApiOperation({ summary: 'Wallet module health check' })
  @ApiOkResponse({ description: 'Wallet module is healthy' })
  health() {
    return buildModuleHealthResponse('wallet');
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get wallet by id' })
  @ApiOkResponse({ description: 'Wallet found' })
  findOne(@Param() params: WalletIdParamDto) {
    return this.walletService.findById(params.id);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Change wallet status' })
  @ApiOkResponse({ description: 'Wallet status updated' })
  updateStatus(
    @Param() params: WalletIdParamDto,
    @Body() dto: UpdateWalletStatusDto,
  ) {
    return this.walletService.updateStatus(params.id, dto.status);
  }
}
