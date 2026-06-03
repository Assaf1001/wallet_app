import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Matches } from 'class-validator';

export class ChargeDto {
  @ApiProperty({ example: 'wallet_550e8400-e29b-41d4-a716-446655440000' })
  @IsString()
  @IsNotEmpty()
  walletId: string;

  @ApiProperty({ example: 'merchant_550e8400-e29b-41d4-a716-446655440000' })
  @IsString()
  @IsNotEmpty()
  merchantId: string;

  @ApiProperty({ example: '25.50', description: 'Positive amount with up to 2 decimal places' })
  @IsString()
  @Matches(/^\d+(\.\d{1,2})?$/)
  amount: string;

  @ApiProperty({ example: 'charge-order-42' })
  @IsString()
  @IsNotEmpty()
  idempotencyKey: string;
}
