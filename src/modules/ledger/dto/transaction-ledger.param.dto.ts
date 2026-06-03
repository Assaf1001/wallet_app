import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class TransactionLedgerParamDto {
  @ApiProperty({ example: 'transaction_550e8400-e29b-41d4-a716-446655440000' })
  @IsString()
  transactionId: string;
}
