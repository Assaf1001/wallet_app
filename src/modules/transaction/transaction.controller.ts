import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { ChargeDto } from './dto/charge.dto';
import { ListTransactionsQueryDto } from './dto/list-transactions-query.dto';
import { RefundDto } from './dto/refund.dto';
import { TransactionIdParamDto } from './dto/transaction-id.param.dto';
import { buildModuleHealthResponse } from '../../shared/health';
import { TransactionService } from './transaction.service';

@ApiTags('transactions')
@Controller('transactions')
export class TransactionController {
  constructor(private readonly transactionService: TransactionService) {}

  @Post('charge')
  @ApiOperation({ summary: 'Charge a wallet' })
  @ApiCreatedResponse({ description: 'Charge processed' })
  charge(@Body() dto: ChargeDto) {
    return this.transactionService.charge(dto);
  }

  @Post('refund')
  @ApiOperation({ summary: 'Refund a charge' })
  @ApiCreatedResponse({ description: 'Refund processed' })
  refund(@Body() dto: RefundDto) {
    return this.transactionService.refund(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List transactions with optional filters' })
  @ApiOkResponse({ description: 'List of transactions' })
  findAll(@Query() query: ListTransactionsQueryDto) {
    const hasFilter =
      query.walletId !== undefined ||
      query.merchantId !== undefined ||
      query.status !== undefined ||
      query.transactionType !== undefined;

    return this.transactionService.findAll(hasFilter ? query : undefined);
  }

  @Get('health')
  @ApiOperation({ summary: 'Transaction module health check' })
  @ApiOkResponse({ description: 'Transaction module is healthy' })
  health() {
    return buildModuleHealthResponse('transaction');
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get transaction by id' })
  @ApiOkResponse({ description: 'Transaction found' })
  findOne(@Param() params: TransactionIdParamDto) {
    return this.transactionService.findById(params.id);
  }
}
