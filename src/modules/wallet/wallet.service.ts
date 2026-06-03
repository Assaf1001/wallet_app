import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  Currency,
  Wallet,
  WalletStatus,
} from '../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class WalletService {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: {
    identity: string;
    currency: Currency;
    status?: WalletStatus;
  }): Promise<Wallet> {
    this.validateIdentity(data.identity);
    if (data.status !== undefined) {
      this.validateStatus(data.status);
    }

    return this.prisma.wallet.create({
      data: {
        identity: data.identity.trim(),
        currency: data.currency,
        status: data.status ?? WalletStatus.ACTIVE,
      },
    });
  }

  async findAll(filter?: {
    status?: WalletStatus;
    currency?: Currency;
    identity?: string;
  }): Promise<Wallet[]> {
    if (filter?.status !== undefined) {
      this.validateStatus(filter.status);
    }

    return this.prisma.wallet.findMany({
      where: {
        status: filter?.status,
        currency: filter?.currency,
        identity: filter?.identity?.trim(),
        deletedAt: null,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id: string): Promise<Wallet> {
    const wallet = await this.prisma.wallet.findFirst({
      where: { id, deletedAt: null },
    });
    if (!wallet) {
      throw new NotFoundException(`Wallet with id ${id} not found`);
    }
    return wallet;
  }

  async updateStatus(id: string, status: WalletStatus): Promise<Wallet> {
    this.validateStatus(status);

    try {
      return await this.prisma.wallet.update({
        where: { id },
        data: { status },
      });
    } catch {
      throw new NotFoundException(`Wallet with id ${id} not found`);
    }
  }

  private validateIdentity(identity: string): void {
    if (!identity || identity.trim().length === 0) {
      throw new BadRequestException('Wallet identity must not be empty');
    }
  }

  private validateStatus(status: WalletStatus): void {
    if (!Object.values(WalletStatus).includes(status)) {
      throw new BadRequestException('Invalid wallet status');
    }
  }
}
