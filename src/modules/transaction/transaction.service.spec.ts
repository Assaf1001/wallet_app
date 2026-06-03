import { randomUUID } from 'node:crypto';
import { BadRequestException } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import config from '../../config/config';
import {
  Currency,
  LedgerEntryType,
  MerchantStatus,
  Prisma,
  TransactionStatus,
  TransactionType,
  WalletStatus,
} from '../../generated/prisma/client';
import { PrismaModule } from '../../prisma/prisma.module';
import { PrismaService } from '../../prisma/prisma.service';
import { TransactionService } from './transaction.service';

describe('TransactionService', () => {
  let service: TransactionService;
  let prisma: PrismaService;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true, load: [config] }),
        PrismaModule,
      ],
      providers: [TransactionService],
    }).compile();

    service = module.get(TransactionService);
    prisma = module.get(PrismaService);
    await prisma.$connect();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  afterEach(async () => {
    await prisma.$executeRaw`
      TRUNCATE TABLE "ledger_entries", "transactions", "wallets", "merchants" CASCADE
    `;
  });

  async function seedWalletAndMerchant(
    balance = '100.00',
    walletStatus: WalletStatus = WalletStatus.ACTIVE,
    merchantStatus: MerchantStatus = MerchantStatus.ACTIVE,
  ) {
    const merchant = await prisma.merchant.create({
      data: { name: `merchant-${randomUUID()}`, status: merchantStatus },
    });
    const wallet = await prisma.wallet.create({
      data: {
        identity: `wallet-${randomUUID()}`,
        currency: Currency.USD,
        balance: new Prisma.Decimal(balance),
        status: walletStatus,
      },
    });
    return { wallet, merchant };
  }

  describe('charge', () => {
    it('creates balanced debit and credit ledger entries immediately on approval', async () => {
      const { wallet, merchant } = await seedWalletAndMerchant('100.00');

      const transaction = await service.charge({
        walletId: wallet.id,
        merchantId: merchant.id,
        amount: '25.50',
        idempotencyKey: `charge-${randomUUID()}`,
      });

      expect(transaction.status).toBe(TransactionStatus.APPROVED);
      expect(transaction.transactionType).toBe(TransactionType.CHARGE);

      const entries = await prisma.ledgerEntry.findMany({
        where: { transactionId: transaction.id },
        orderBy: { type: 'asc' },
      });

      expect(entries).toHaveLength(2);
      expect(entries.map((e) => e.type).sort()).toEqual([
        LedgerEntryType.CREDIT,
        LedgerEntryType.DEBIT,
      ]);
      expect(entries.every((e) => e.amount.equals(new Prisma.Decimal('25.50')))).toBe(
        true,
      );
      expect(entries.every((e) => e.currency === Currency.USD)).toBe(true);
      expect(entries.every((e) => e.walletId === wallet.id)).toBe(true);

      const updatedWallet = await prisma.wallet.findUniqueOrThrow({
        where: { id: wallet.id },
      });
      expect(updatedWallet.balance.equals(new Prisma.Decimal('74.50'))).toBe(true);
    });

    it('does not change wallet balance or create ledger entries when declined', async () => {
      const { wallet, merchant } = await seedWalletAndMerchant('10.00');

      const transaction = await service.charge({
        walletId: wallet.id,
        merchantId: merchant.id,
        amount: '50.00',
        idempotencyKey: `charge-${randomUUID()}`,
      });

      expect(transaction.status).toBe(TransactionStatus.REJECTED);
      expect(transaction.declineMessage).toBe('Insufficient wallet balance');

      const unchangedWallet = await prisma.wallet.findUniqueOrThrow({
        where: { id: wallet.id },
      });
      expect(unchangedWallet.balance.equals(new Prisma.Decimal('10.00'))).toBe(true);
      expect(unchangedWallet.version).toBe(wallet.version);

      const entries = await prisma.ledgerEntry.findMany({
        where: { transactionId: transaction.id },
      });
      expect(entries).toHaveLength(0);
    });

  });

  describe('merchant must be active', () => {
    it('declines charge when merchant is inactive', async () => {
      const { wallet, merchant } = await seedWalletAndMerchant(
        '100.00',
        WalletStatus.ACTIVE,
        MerchantStatus.INACTIVE,
      );

      const transaction = await service.charge({
        walletId: wallet.id,
        merchantId: merchant.id,
        amount: '10.00',
        idempotencyKey: `charge-${randomUUID()}`,
      });

      expect(transaction.status).toBe(TransactionStatus.REJECTED);
      expect(transaction.declineMessage).toBe('Merchant is not active');

      const unchangedWallet = await prisma.wallet.findUniqueOrThrow({
        where: { id: wallet.id },
      });
      expect(unchangedWallet.balance.equals(new Prisma.Decimal('100.00'))).toBe(true);

      const entries = await prisma.ledgerEntry.findMany({
        where: { transactionId: transaction.id },
      });
      expect(entries).toHaveLength(0);
    });

    it('rejects refund when merchant is inactive', async () => {
      const { wallet, merchant } = await seedWalletAndMerchant('100.00');

      const charge = await service.charge({
        walletId: wallet.id,
        merchantId: merchant.id,
        amount: '20.00',
        idempotencyKey: `charge-${randomUUID()}`,
      });

      await prisma.merchant.update({
        where: { id: merchant.id },
        data: { status: MerchantStatus.INACTIVE },
      });

      const balanceBeforeRefund = (
        await prisma.wallet.findUniqueOrThrow({ where: { id: wallet.id } })
      ).balance;

      await expect(
        service.refund({
          originalTransactionId: charge.id,
          amount: '10.00',
          idempotencyKey: `refund-${randomUUID()}`,
        }),
      ).rejects.toThrow(BadRequestException);

      await expect(
        service.refund({
          originalTransactionId: charge.id,
          amount: '10.00',
          idempotencyKey: `refund-${randomUUID()}`,
        }),
      ).rejects.toThrow('Merchant is not active');

      const walletAfter = await prisma.wallet.findUniqueOrThrow({
        where: { id: wallet.id },
      });
      expect(walletAfter.balance.equals(balanceBeforeRefund)).toBe(true);

      const refundCount = await prisma.transaction.count({
        where: {
          transactionType: TransactionType.REFUND,
          originalTransactionId: charge.id,
        },
      });
      expect(refundCount).toBe(0);
    });
  });

  describe('refund', () => {
    it('creates balanced credit and debit ledger entries for the refund transaction', async () => {
      const { wallet, merchant } = await seedWalletAndMerchant('100.00');

      const charge = await service.charge({
        walletId: wallet.id,
        merchantId: merchant.id,
        amount: '40.00',
        idempotencyKey: `charge-${randomUUID()}`,
      });

      const refund = await service.refund({
        originalTransactionId: charge.id,
        amount: '15.00',
        idempotencyKey: `refund-${randomUUID()}`,
      });

      expect(refund.status).toBe(TransactionStatus.APPROVED);
      expect(refund.transactionType).toBe(TransactionType.REFUND);
      expect(refund.originalTransactionId).toBe(charge.id);

      const entries = await prisma.ledgerEntry.findMany({
        where: { transactionId: refund.id },
        orderBy: { type: 'asc' },
      });

      expect(entries).toHaveLength(2);
      expect(entries.map((e) => e.type).sort()).toEqual([
        LedgerEntryType.CREDIT,
        LedgerEntryType.DEBIT,
      ]);
      expect(entries.every((e) => e.amount.equals(new Prisma.Decimal('15.00')))).toBe(
        true,
      );

      const updatedWallet = await prisma.wallet.findUniqueOrThrow({
        where: { id: wallet.id },
      });
      expect(updatedWallet.balance.equals(new Prisma.Decimal('75.00'))).toBe(true);
    });
  });

  describe('concurrent transactions', () => {
    it('approves both charges when the wallet has sufficient balance', async () => {
      const { wallet, merchant } = await seedWalletAndMerchant('100.00');

      const [first, second] = await Promise.all([
        service.charge({
          walletId: wallet.id,
          merchantId: merchant.id,
          amount: '30.00',
          idempotencyKey: `charge-${randomUUID()}`,
        }),
        service.charge({
          walletId: wallet.id,
          merchantId: merchant.id,
          amount: '30.00',
          idempotencyKey: `charge-${randomUUID()}`,
        }),
      ]);

      expect(first.status).toBe(TransactionStatus.APPROVED);
      expect(second.status).toBe(TransactionStatus.APPROVED);

      const updatedWallet = await prisma.wallet.findUniqueOrThrow({
        where: { id: wallet.id },
      });
      expect(updatedWallet.balance.equals(new Prisma.Decimal('40.00'))).toBe(true);
      expect(updatedWallet.version).toBe(wallet.version + 2);
    });

    it('declines the losing charge when concurrent charges exceed balance', async () => {
      const { wallet, merchant } = await seedWalletAndMerchant('100.00');

      const [first, second] = await Promise.all([
        service.charge({
          walletId: wallet.id,
          merchantId: merchant.id,
          amount: '60.00',
          idempotencyKey: `charge-${randomUUID()}`,
        }),
        service.charge({
          walletId: wallet.id,
          merchantId: merchant.id,
          amount: '60.00',
          idempotencyKey: `charge-${randomUUID()}`,
        }),
      ]);

      const approved = [first, second].filter(
        (tx) => tx.status === TransactionStatus.APPROVED,
      );
      const rejected = [first, second].filter(
        (tx) => tx.status === TransactionStatus.REJECTED,
      );

      expect(approved).toHaveLength(1);
      expect(rejected).toHaveLength(1);
      expect(rejected[0].declineMessage).toBe('Insufficient wallet balance');

      const updatedWallet = await prisma.wallet.findUniqueOrThrow({
        where: { id: wallet.id },
      });
      expect(updatedWallet.balance.equals(new Prisma.Decimal('40.00'))).toBe(true);
      expect(updatedWallet.version).toBe(wallet.version + 1);
    });
  });

  describe('ledger immutability', () => {
    it('rejects updates and deletes on ledger entries', async () => {
      const { wallet, merchant } = await seedWalletAndMerchant('50.00');

      const transaction = await service.charge({
        walletId: wallet.id,
        merchantId: merchant.id,
        amount: '10.00',
        idempotencyKey: `charge-${randomUUID()}`,
      });

      const [entry] = await prisma.ledgerEntry.findMany({
        where: { transactionId: transaction.id },
        take: 1,
      });

      await expect(
        prisma.ledgerEntry.update({
          where: { id: entry.id },
          data: { amount: new Prisma.Decimal('99.99') },
        }),
      ).rejects.toThrow(/ledger_entries are immutable/i);

      await expect(
        prisma.ledgerEntry.delete({ where: { id: entry.id } }),
      ).rejects.toThrow(/ledger_entries are immutable/i);
    });
  });
});
