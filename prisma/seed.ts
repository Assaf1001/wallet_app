import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import {
  Currency,
  LedgerEntryType,
  MerchantStatus,
  Prisma,
  PrismaClient,
  TransactionStatus,
  TransactionType,
  WalletStatus,
} from '../src/generated/prisma/client';

const ROW_COUNT = 10;

const MERCHANT_NAMES = [
  'Acme Payments',
  'Blue Harbor Cafe',
  'Cloud Retail Co',
  'Delta Logistics',
  'Evergreen Market',
  'Fusion Gadgets',
  'Golden Gate Tours',
  'Harbor Books',
  'Iron Peak Fitness',
  'Juniper Health',
];

const WALLET_IDENTITIES = Array.from(
  { length: ROW_COUNT },
  (_, i) => `seed-user-${String(i + 1).padStart(2, '0')}`,
);

const CURRENCIES: Currency[] = [
  Currency.USD,
  Currency.EUR,
  Currency.ILS,
  Currency.USD,
  Currency.EUR,
  Currency.ILS,
  Currency.USD,
  Currency.EUR,
  Currency.ILS,
  Currency.USD,
];

function decimal(value: string): Prisma.Decimal {
  return new Prisma.Decimal(value);
}

function createPrisma(): PrismaClient {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error('DATABASE_URL is required to run the seed');
  }
  const adapter = new PrismaPg({ connectionString: url });
  return new PrismaClient({ adapter });
}

async function createBalancedLedgerEntries(
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

async function main(): Promise<void> {
  const prisma = createPrisma();

  try {
    await prisma.$executeRaw`
    TRUNCATE TABLE "ledger_entries", "transactions", "wallets", "merchants" CASCADE
  `;

    const merchants = await Promise.all(
    MERCHANT_NAMES.map((name, index) =>
      prisma.merchant.create({
        data: {
          name,
          status:
            index === 4 || index === 8
              ? MerchantStatus.INACTIVE
              : MerchantStatus.ACTIVE,
        },
      }),
    ),
  );

  const wallets = await Promise.all(
    WALLET_IDENTITIES.map((identity, index) =>
      prisma.wallet.create({
        data: {
          identity,
          currency: CURRENCIES[index],
          balance: decimal(
            ['500.00', '1000.00', '200.00', '75.50', '1200.00', '42.00', '88.88', '300.00', '1500.00', '10.00'][
              index
            ],
          ),
          status:
            index === 9 ? WalletStatus.INACTIVE : WalletStatus.ACTIVE,
        },
      }),
    ),
  );

  const approvedCharge1 = await prisma.transaction.create({
    data: {
      walletId: wallets[0].id,
      merchantId: merchants[0].id,
      transactionType: TransactionType.CHARGE,
      amount: decimal('25.00'),
      currency: wallets[0].currency,
      status: TransactionStatus.APPROVED,
      idempotencyKey: 'seed-charge-001',
    },
  });

  const approvedCharge2 = await prisma.transaction.create({
    data: {
      walletId: wallets[0].id,
      merchantId: merchants[1].id,
      transactionType: TransactionType.CHARGE,
      amount: decimal('10.00'),
      currency: wallets[0].currency,
      status: TransactionStatus.APPROVED,
      idempotencyKey: 'seed-charge-002',
    },
  });

  const approvedCharge3 = await prisma.transaction.create({
    data: {
      walletId: wallets[1].id,
      merchantId: merchants[2].id,
      transactionType: TransactionType.CHARGE,
      amount: decimal('50.00'),
      currency: wallets[1].currency,
      status: TransactionStatus.APPROVED,
      idempotencyKey: 'seed-charge-003',
    },
  });

  const approvedCharge4 = await prisma.transaction.create({
    data: {
      walletId: wallets[2].id,
      merchantId: merchants[3].id,
      transactionType: TransactionType.CHARGE,
      amount: decimal('15.00'),
      currency: wallets[2].currency,
      status: TransactionStatus.APPROVED,
      idempotencyKey: 'seed-charge-004',
    },
  });

  const approvedRefund = await prisma.transaction.create({
    data: {
      walletId: wallets[0].id,
      merchantId: merchants[0].id,
      transactionType: TransactionType.REFUND,
      amount: decimal('25.00'),
      currency: wallets[0].currency,
      status: TransactionStatus.APPROVED,
      originalTransactionId: approvedCharge1.id,
      idempotencyKey: 'seed-refund-001',
    },
  });

  await prisma.$transaction(async (tx) => {
    for (const [transaction, amount, debitType, creditType] of [
      [
        approvedCharge1,
        decimal('25.00'),
        LedgerEntryType.DEBIT,
        LedgerEntryType.CREDIT,
      ],
      [
        approvedCharge2,
        decimal('10.00'),
        LedgerEntryType.DEBIT,
        LedgerEntryType.CREDIT,
      ],
      [
        approvedCharge3,
        decimal('50.00'),
        LedgerEntryType.DEBIT,
        LedgerEntryType.CREDIT,
      ],
      [
        approvedCharge4,
        decimal('15.00'),
        LedgerEntryType.DEBIT,
        LedgerEntryType.CREDIT,
      ],
      [
        approvedRefund,
        decimal('25.00'),
        LedgerEntryType.CREDIT,
        LedgerEntryType.DEBIT,
      ],
    ] as const) {
      await createBalancedLedgerEntries(tx, {
        walletId: transaction.walletId,
        transactionId: transaction.id,
        currency: transaction.currency,
        amount,
        debitType,
        creditType,
      });
    }

    await tx.wallet.update({
      where: { id: wallets[0].id },
      data: { balance: decimal('490.00'), version: 3 },
    });
    await tx.wallet.update({
      where: { id: wallets[1].id },
      data: { balance: decimal('950.00'), version: 1 },
    });
    await tx.wallet.update({
      where: { id: wallets[2].id },
      data: { balance: decimal('185.00'), version: 1 },
    });
  });

  await prisma.transaction.createMany({
    data: [
      {
        walletId: wallets[3].id,
        merchantId: merchants[4].id,
        transactionType: TransactionType.CHARGE,
        amount: decimal('5.00'),
        currency: wallets[3].currency,
        status: TransactionStatus.REJECTED,
        declineMessage: 'Merchant is not active',
        idempotencyKey: 'seed-charge-005',
      },
      {
        walletId: wallets[4].id,
        merchantId: merchants[5].id,
        transactionType: TransactionType.CHARGE,
        amount: decimal('12.50'),
        currency: wallets[4].currency,
        status: TransactionStatus.PENDING,
        idempotencyKey: 'seed-charge-006',
      },
      {
        walletId: wallets[5].id,
        merchantId: merchants[6].id,
        transactionType: TransactionType.CHARGE,
        amount: decimal('8.00'),
        currency: wallets[5].currency,
        status: TransactionStatus.FAILED,
        idempotencyKey: 'seed-charge-007',
      },
      {
        walletId: wallets[6].id,
        merchantId: merchants[7].id,
        transactionType: TransactionType.CHARGE,
        amount: decimal('200.00'),
        currency: wallets[6].currency,
        status: TransactionStatus.REJECTED,
        declineMessage: 'Insufficient wallet balance',
        idempotencyKey: 'seed-charge-008',
      },
      {
        walletId: wallets[9].id,
        merchantId: merchants[8].id,
        transactionType: TransactionType.CHARGE,
        amount: decimal('3.25'),
        currency: wallets[9].currency,
        status: TransactionStatus.REJECTED,
        declineMessage: 'Wallet is not active',
        idempotencyKey: 'seed-charge-009',
      },
    ],
  });

  const counts = await Promise.all([
    prisma.merchant.count(),
    prisma.wallet.count(),
    prisma.transaction.count(),
    prisma.ledgerEntry.count(),
  ]);

  console.log('Seed completed:', {
    merchants: counts[0],
    wallets: counts[1],
    transactions: counts[2],
    ledgerEntries: counts[3],
  });
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error('Seed failed:', error);
  process.exit(1);
});
