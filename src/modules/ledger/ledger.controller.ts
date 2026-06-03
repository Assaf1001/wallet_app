import { Controller, Get, Param } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { TransactionLedgerParamDto } from './dto/transaction-ledger.param.dto';
import { WalletLedgerParamDto } from './dto/wallet-ledger.param.dto';
import { buildModuleHealthResponse } from '../../shared/health';
import { LedgerService } from './ledger.service';

@ApiTags('ledger')
@Controller()
export class LedgerController {
  constructor(private readonly ledgerService: LedgerService) {}

  @Get('ledger/health')
  @ApiOperation({ summary: 'Ledger module health check' })
  @ApiOkResponse({ description: 'Ledger module is healthy' })
  health() {
    return buildModuleHealthResponse('ledger');
  }

  @Get('wallets/:walletId/ledger-entries')
  @ApiOperation({ summary: 'List ledger entries for a wallet' })
  @ApiOkResponse({ description: 'Ledger entries for the wallet' })
  findByWallet(@Param() params: WalletLedgerParamDto) {
    return this.ledgerService.findByWalletId(params.walletId);
  }

  @Get('transactions/:transactionId/ledger-entries')
  @ApiOperation({ summary: 'List ledger entries for a transaction' })
  @ApiOkResponse({ description: 'Ledger entries for the transaction' })
  findByTransaction(@Param() params: TransactionLedgerParamDto) {
    return this.ledgerService.findByTransactionId(params.transactionId);
  }
}
