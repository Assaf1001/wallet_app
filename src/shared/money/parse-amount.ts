import { BadRequestException } from '@nestjs/common';
import Decimal from 'decimal.js';
import { Prisma } from '../../generated/prisma/client';

const AMOUNT_PATTERN = /^\d+(\.\d{1,2})?$/;

export function parseAmount(value: string): Prisma.Decimal {
  if (!AMOUNT_PATTERN.test(value)) {
    throw new BadRequestException(
      'Amount must be a positive number with up to 2 decimal places',
    );
  }

  const decimal = new Decimal(value);
  if (!decimal.isPositive()) {
    throw new BadRequestException('Amount must be greater than zero');
  }

  return new Prisma.Decimal(value);
}

export function toDecimal(value: Prisma.Decimal): Decimal {
  return new Decimal(value.toString());
}
