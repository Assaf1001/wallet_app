import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { Currency, WalletStatus } from '../../../generated/prisma/client';

export class CreateWalletDto {
  @ApiProperty({ example: 'user-123' })
  @IsString()
  @IsNotEmpty()
  identity: string;

  @ApiProperty({ enum: Currency, example: Currency.USD })
  @IsEnum(Currency)
  currency: Currency;

  @ApiPropertyOptional({ enum: WalletStatus, example: WalletStatus.ACTIVE })
  @IsOptional()
  @IsEnum(WalletStatus)
  status?: WalletStatus;
}
