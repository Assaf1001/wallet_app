import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { MerchantStatus } from '../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { MerchantService } from './merchant.service';

describe('MerchantService', () => {
  let service: MerchantService;

  const merchant = {
    id: 'merchant-id',
    name: 'Acme Corp',
    status: MerchantStatus.ACTIVE,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  };

  const prisma = {
    merchant: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MerchantService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get(MerchantService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('creates a merchant with default ACTIVE status', async () => {
      prisma.merchant.create.mockResolvedValue(merchant);

      await expect(service.create({ name: 'Acme Corp' })).resolves.toEqual(
        merchant,
      );
      expect(prisma.merchant.create).toHaveBeenCalledWith({
        data: { name: 'Acme Corp', status: MerchantStatus.ACTIVE },
      });
    });

    it('rejects an empty name', async () => {
      await expect(service.create({ name: '   ' })).rejects.toThrow(
        BadRequestException,
      );
      expect(prisma.merchant.create).not.toHaveBeenCalled();
    });
  });

  describe('findById', () => {
    it('returns the merchant when found', async () => {
      prisma.merchant.findUnique.mockResolvedValue(merchant);

      await expect(service.findById(merchant.id)).resolves.toEqual(merchant);
    });

    it('throws when the merchant does not exist', async () => {
      prisma.merchant.findUnique.mockResolvedValue(null);

      await expect(service.findById('missing-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('updateStatus', () => {
    it('updates merchant status', async () => {
      const updated = { ...merchant, status: MerchantStatus.INACTIVE };
      prisma.merchant.update.mockResolvedValue(updated);

      await expect(
        service.updateStatus(merchant.id, MerchantStatus.INACTIVE),
      ).resolves.toEqual(updated);
    });

    it('throws when the merchant does not exist', async () => {
      prisma.merchant.update.mockRejectedValue(new Error('Record not found'));

      await expect(
        service.updateStatus('missing-id', MerchantStatus.INACTIVE),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
