import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import {
  TransactionStatus,
  TransactionType,
} from '../../../generated/prisma/client';

export class ListTransactionsQueryDto {
  @ApiPropertyOptional({ example: 'wallet_550e8400-e29b-41d4-a716-446655440000' })
  @IsOptional()
  @IsString()
  walletId?: string;

  @ApiPropertyOptional({ example: 'merchant_550e8400-e29b-41d4-a716-446655440000' })
  @IsOptional()
  @IsString()
  merchantId?: string;

  @ApiPropertyOptional({ enum: TransactionStatus })
  @IsOptional()
  @IsEnum(TransactionStatus)
  status?: TransactionStatus;

  @ApiPropertyOptional({ enum: TransactionType })
  @IsOptional()
  @IsEnum(TransactionType)
  transactionType?: TransactionType;
}
