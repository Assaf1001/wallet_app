import { ConfigService } from '@nestjs/config';
import { WalletStatus } from '../generated/prisma/client';
import { PrismaService } from './prisma.service';

describe('PrismaService', () => {
  const configService = {
    get: jest.fn().mockReturnValue({ url: process.env.DATABASE_URL }),
  } as unknown as ConfigService;
  it('imports generated Prisma client types', () => {
    expect(WalletStatus.ACTIVE).toBe('ACTIVE');
  });

  it('can be constructed', () => {
    const service = new PrismaService(configService);
    expect(service).toBeInstanceOf(PrismaService);
  });
});
