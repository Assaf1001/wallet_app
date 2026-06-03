import { Test, TestingModule } from '@nestjs/testing';
import { MerchantStatus } from '../../generated/prisma/client';
import { MerchantController } from './merchant.controller';
import { MerchantService } from './merchant.service';

describe('MerchantController', () => {
  let controller: MerchantController;

  const merchant = {
    id: 'merchant-id',
    name: 'Acme Corp',
    status: MerchantStatus.ACTIVE,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  };

  const merchantService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findById: jest.fn(),
    updateStatus: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [MerchantController],
      providers: [{ provide: MerchantService, useValue: merchantService }],
    }).compile();

    controller = module.get(MerchantController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('delegates to MerchantService.create', async () => {
      merchantService.create.mockResolvedValue(merchant);
      const dto = { name: 'Acme Corp' };

      await expect(controller.create(dto)).resolves.toEqual(merchant);
      expect(merchantService.create).toHaveBeenCalledWith(dto);
    });
  });

  describe('findAll', () => {
    it('lists merchants without a filter', async () => {
      merchantService.findAll.mockResolvedValue([merchant]);

      await expect(controller.findAll()).resolves.toEqual([merchant]);
      expect(merchantService.findAll).toHaveBeenCalledWith(undefined);
    });

    it('lists merchants filtered by status', async () => {
      merchantService.findAll.mockResolvedValue([merchant]);

      await expect(controller.findAll(MerchantStatus.ACTIVE)).resolves.toEqual(
        [merchant],
      );
      expect(merchantService.findAll).toHaveBeenCalledWith({
        status: MerchantStatus.ACTIVE,
      });
    });
  });

  describe('findOne', () => {
    it('delegates to MerchantService.findById', async () => {
      merchantService.findById.mockResolvedValue(merchant);

      await expect(controller.findOne({ id: merchant.id })).resolves.toEqual(
        merchant,
      );
      expect(merchantService.findById).toHaveBeenCalledWith(merchant.id);
    });
  });

  describe('updateStatus', () => {
    it('delegates to MerchantService.updateStatus', async () => {
      const updated = { ...merchant, status: MerchantStatus.INACTIVE };
      merchantService.updateStatus.mockResolvedValue(updated);

      await expect(
        controller.updateStatus(
          { id: merchant.id },
          { status: MerchantStatus.INACTIVE },
        ),
      ).resolves.toEqual(updated);
      expect(merchantService.updateStatus).toHaveBeenCalledWith(
        merchant.id,
        MerchantStatus.INACTIVE,
      );
    });
  });

  describe('health', () => {
    it('returns merchant module health', () => {
      const response = controller.health();

      expect(response.status).toBe('ok');
      expect(response.module).toBe('merchant');
      expect(response.timestamp).toBeDefined();
    });
  });
});
