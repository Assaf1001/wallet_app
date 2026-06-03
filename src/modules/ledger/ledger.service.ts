import { Injectable, NotFoundException } from '@nestjs/common';
import { LedgerEntry } from '../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class LedgerService {
  constructor(private readonly prisma: PrismaService) {}

  async findByWalletId(walletId: string): Promise<LedgerEntry[]> {
    const wallet = await this.prisma.wallet.findFirst({
      where: { id: walletId, deletedAt: null },
    });
    if (!wallet) {
      throw new NotFoundException(`Wallet with id ${walletId} not found`);
    }

    return this.prisma.ledgerEntry.findMany({
      where: { walletId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findByTransactionId(transactionId: string): Promise<LedgerEntry[]> {
    const transaction = await this.prisma.transaction.findFirst({
      where: { id: transactionId, deletedAt: null },
    });
    if (!transaction) {
      throw new NotFoundException(
        `Transaction with id ${transactionId} not found`,
      );
    }

    return this.prisma.ledgerEntry.findMany({
      where: { transactionId },
      orderBy: { createdAt: 'asc' },
    });
  }
}
