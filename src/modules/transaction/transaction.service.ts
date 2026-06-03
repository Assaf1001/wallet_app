import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import Decimal from 'decimal.js';
import {
  Currency,
  LedgerEntryType,
  MerchantStatus,
  Prisma,
  Transaction,
  TransactionStatus,
  TransactionType,
  WalletStatus,
} from '../../generated/prisma/client';
import { parseAmount, toDecimal } from '../../shared/money/parse-amount';
import { PrismaService } from '../../prisma/prisma.service';
import { ChargeDto } from './dto/charge.dto';
import { RefundDto } from './dto/refund.dto';
import { ListTransactionsQueryDto } from './dto/list-transactions-query.dto';

@Injectable()
export class TransactionService {
  private static readonly WALLET_UPDATE_MAX_ATTEMPTS = 5;

  constructor(private readonly prisma: PrismaService) {}

  async charge(dto: ChargeDto): Promise<Transaction> {
    const amount = parseAmount(dto.amount);

    const existing = await this.findByIdempotency(
      dto.walletId,
      dto.idempotencyKey,
    );
    if (existing) {
      return existing;
    }

    return this.runWalletMutation(async (tx) => {
      const wallet = await tx.wallet.findFirst({
        where: { id: dto.walletId, deletedAt: null },
      });
      if (!wallet) {
        throw new NotFoundException(`Wallet with id ${dto.walletId} not found`);
      }

      const merchant = await tx.merchant.findFirst({
        where: { id: dto.merchantId, deletedAt: null },
      });
      if (!merchant) {
        throw new NotFoundException(
          `Merchant with id ${dto.merchantId} not found`,
        );
      }

      const declineReason = this.validateChargePrerequisites(
        wallet,
        merchant,
        amount,
      );

      if (declineReason) {
        return tx.transaction.create({
          data: {
            walletId: wallet.id,
            merchantId: merchant.id,
            transactionType: TransactionType.CHARGE,
            amount,
            currency: wallet.currency,
            status: TransactionStatus.REJECTED,
            declineMessage: declineReason,
            idempotencyKey: dto.idempotencyKey,
          },
        });
      }

      const newBalance = toDecimal(wallet.balance).minus(toDecimal(amount));

      const transaction = await tx.transaction.create({
        data: {
          walletId: wallet.id,
          merchantId: merchant.id,
          transactionType: TransactionType.CHARGE,
          amount,
          currency: wallet.currency,
          status: TransactionStatus.APPROVED,
          idempotencyKey: dto.idempotencyKey,
        },
      });

      await tx.wallet.update({
        where: { id: wallet.id, version: wallet.version },
        data: {
          balance: new Prisma.Decimal(newBalance.toFixed(2)),
          version: { increment: 1 },
        },
      });

      await this.createBalancedLedgerEntries(tx, {
        walletId: wallet.id,
        transactionId: transaction.id,
        currency: wallet.currency,
        amount,
        debitType: LedgerEntryType.DEBIT,
        creditType: LedgerEntryType.CREDIT,
      });

      return transaction;
    });
  }

  async refund(dto: RefundDto): Promise<Transaction> {
    const original = await this.prisma.transaction.findFirst({
      where: { id: dto.originalTransactionId, deletedAt: null },
    });
    if (!original) {
      throw new NotFoundException(
        `Transaction with id ${dto.originalTransactionId} not found`,
      );
    }

    const existing = await this.findByIdempotency(
      original.walletId,
      dto.idempotencyKey,
    );
    if (existing) {
      return existing;
    }

    const refundAmount = dto.amount
      ? parseAmount(dto.amount)
      : original.amount;

    return this.runWalletMutation(async (tx) => {
      const originalTx = await tx.transaction.findFirst({
        where: { id: dto.originalTransactionId, deletedAt: null },
      });
      if (!originalTx) {
        throw new NotFoundException(
          `Transaction with id ${dto.originalTransactionId} not found`,
        );
      }

      if (originalTx.transactionType !== TransactionType.CHARGE) {
        throw new BadRequestException('Only charge transactions can be refunded');
      }

      if (originalTx.status !== TransactionStatus.APPROVED) {
        throw new BadRequestException(
          'Only approved charge transactions can be refunded',
        );
      }

      const refundedTotal = await this.sumApprovedRefunds(
        tx,
        originalTx.id,
      );
      const remaining = toDecimal(originalTx.amount).minus(refundedTotal);

      if (remaining.lte(0)) {
        throw new BadRequestException(
          'Original charge has already been fully refunded',
        );
      }

      if (toDecimal(refundAmount).gt(remaining)) {
        throw new BadRequestException(
          'Refund amount exceeds remaining refundable balance',
        );
      }

      const wallet = await tx.wallet.findFirst({
        where: { id: originalTx.walletId, deletedAt: null },
      });
      if (!wallet) {
        throw new NotFoundException(
          `Wallet with id ${originalTx.walletId} not found`,
        );
      }

      if (wallet.status !== WalletStatus.ACTIVE) {
        throw new BadRequestException('Wallet is not active');
      }

      const merchant = await tx.merchant.findFirst({
        where: { id: originalTx.merchantId, deletedAt: null },
      });
      if (!merchant) {
        throw new NotFoundException(
          `Merchant with id ${originalTx.merchantId} not found`,
        );
      }

      if (merchant.status !== MerchantStatus.ACTIVE) {
        throw new BadRequestException('Merchant is not active');
      }

      const newBalance = toDecimal(wallet.balance).plus(toDecimal(refundAmount));

      const transaction = await tx.transaction.create({
        data: {
          walletId: wallet.id,
          merchantId: originalTx.merchantId,
          transactionType: TransactionType.REFUND,
          amount: refundAmount,
          currency: originalTx.currency,
          status: TransactionStatus.APPROVED,
          originalTransactionId: originalTx.id,
          idempotencyKey: dto.idempotencyKey,
        },
      });

      await tx.wallet.update({
        where: { id: wallet.id, version: wallet.version },
        data: {
          balance: new Prisma.Decimal(newBalance.toFixed(2)),
          version: { increment: 1 },
        },
      });

      await this.createBalancedLedgerEntries(tx, {
        walletId: wallet.id,
        transactionId: transaction.id,
        currency: wallet.currency,
        amount: refundAmount,
        debitType: LedgerEntryType.CREDIT,
        creditType: LedgerEntryType.DEBIT,
      });

      return transaction;
    });
  }

  async findAll(
    filter?: ListTransactionsQueryDto,
  ): Promise<Transaction[]> {
    return this.prisma.transaction.findMany({
      where: {
        walletId: filter?.walletId,
        merchantId: filter?.merchantId,
        status: filter?.status,
        transactionType: filter?.transactionType,
        deletedAt: null,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id: string): Promise<Transaction> {
    const transaction = await this.prisma.transaction.findFirst({
      where: { id, deletedAt: null },
    });
    if (!transaction) {
      throw new NotFoundException(`Transaction with id ${id} not found`);
    }
    return transaction;
  }

  private async runWalletMutation<T>(
    operation: (tx: Prisma.TransactionClient) => Promise<T>,
  ): Promise<T> {
    for (
      let attempt = 1;
      attempt <= TransactionService.WALLET_UPDATE_MAX_ATTEMPTS;
      attempt++
    ) {
      try {
        return await this.prisma.$transaction(operation);
      } catch (error) {
        if (
          attempt < TransactionService.WALLET_UPDATE_MAX_ATTEMPTS &&
          this.isOptimisticLockConflict(error)
        ) {
          continue;
        }
        throw error;
      }
    }

    throw new Error('Wallet mutation exceeded maximum retry attempts');
  }

  private isOptimisticLockConflict(error: unknown): boolean {
    return (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2025'
    );
  }

  private async findByIdempotency(
    walletId: string,
    idempotencyKey: string,
  ): Promise<Transaction | null> {
    return this.prisma.transaction.findUnique({
      where: {
        walletId_idempotencyKey: { walletId, idempotencyKey },
      },
    });
  }

  private async sumApprovedRefunds(
    tx: Prisma.TransactionClient,
    originalTransactionId: string,
  ): Promise<Decimal> {
    const refunds = await tx.transaction.findMany({
      where: {
        originalTransactionId,
        transactionType: TransactionType.REFUND,
        status: TransactionStatus.APPROVED,
        deletedAt: null,
      },
      select: { amount: true },
    });

    return refunds.reduce(
      (sum, row) => sum.plus(toDecimal(row.amount)),
      new Decimal(0),
    );
  }

  private validateChargePrerequisites(
    wallet: { status: WalletStatus; currency: Currency; balance: Prisma.Decimal },
    merchant: { status: MerchantStatus },
    amount: Prisma.Decimal,
  ): string | null {
    if (wallet.status !== WalletStatus.ACTIVE) {
      return 'Wallet is not active';
    }

    if (merchant.status !== MerchantStatus.ACTIVE) {
      return 'Merchant is not active';
    }

    if (toDecimal(wallet.balance).lt(toDecimal(amount))) {
      return 'Insufficient wallet balance';
    }

    return null;
  }

  private async createBalancedLedgerEntries(
    tx: Prisma.TransactionClient,
    params: {
      walletId: string;
      transactionId: string;
      currency: Currency;
      amount: Prisma.Decimal;
      debitType: LedgerEntryType;
      creditType: LedgerEntryType;
    },
  ): Promise<void> {
    await tx.ledgerEntry.createMany({
      data: [
        {
          walletId: params.walletId,
          transactionId: params.transactionId,
          type: params.debitType,
          amount: params.amount,
          currency: params.currency,
        },
        {
          walletId: params.walletId,
          transactionId: params.transactionId,
          type: params.creditType,
          amount: params.amount,
          currency: params.currency,
        },
      ],
    });
  }
}
