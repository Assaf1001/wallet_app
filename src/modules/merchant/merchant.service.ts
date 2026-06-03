import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Merchant, MerchantStatus } from '../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class MerchantService {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: {
    name: string;
    status?: MerchantStatus;
  }): Promise<Merchant> {
    this.validateName(data.name);

    return this.prisma.merchant.create({
      data: {
        name: data.name,
        status: data.status ?? MerchantStatus.ACTIVE,
      },
    });
  }

  async findAll(filter?: { status?: MerchantStatus }): Promise<Merchant[]> {
    if (filter?.status !== undefined) {
      this.validateStatus(filter.status);
    }

    return this.prisma.merchant.findMany({
      where: filter?.status ? { status: filter.status } : undefined,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id: string): Promise<Merchant> {
    const merchant = await this.prisma.merchant.findUnique({ where: { id } });
    if (!merchant) {
      throw new NotFoundException(`Merchant with id ${id} not found`);
    }
    return merchant;
  }

  async updateStatus(id: string, status: MerchantStatus): Promise<Merchant> {
    this.validateStatus(status);

    try {
      return await this.prisma.merchant.update({
        where: { id },
        data: { status },
      });
    } catch {
      throw new NotFoundException(`Merchant with id ${id} not found`);
    }
  }

  private validateName(name: string): void {
    if (!name || name.trim().length === 0) {
      throw new BadRequestException('Merchant name must not be empty');
    }
  }

  private validateStatus(status: MerchantStatus): void {
    if (!Object.values(MerchantStatus).includes(status)) {
      throw new BadRequestException('Invalid merchant status');
    }
  }
}
