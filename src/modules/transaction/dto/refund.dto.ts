import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, Matches } from 'class-validator';

export class RefundDto {
  @ApiProperty({ example: 'transaction_550e8400-e29b-41d4-a716-446655440000' })
  @IsString()
  @IsNotEmpty()
  originalTransactionId: string;

  @ApiPropertyOptional({
    example: '10.00',
    description: 'Partial refund amount; defaults to remaining refundable balance',
  })
  @IsOptional()
  @IsString()
  @Matches(/^\d+(\.\d{1,2})?$/)
  amount?: string;

  @ApiProperty({ example: 'refund-order-42' })
  @IsString()
  @IsNotEmpty()
  idempotencyKey: string;
}
