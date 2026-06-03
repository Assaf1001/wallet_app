import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import config from './config/config';
import { LedgerModule } from './modules/ledger/ledger.module';
import { MerchantModule } from './modules/merchant/merchant.module';
import { TransactionModule } from './modules/transaction/transaction.module';
import { WalletModule } from './modules/wallet/wallet.module';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [config] }),
    PrismaModule,
    MerchantModule,
    WalletModule,
    TransactionModule,
    LedgerModule,
  ],
  controllers: [AppController],
  providers: [],
})
export class AppModule {}
