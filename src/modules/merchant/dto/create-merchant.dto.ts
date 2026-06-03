import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { MerchantStatus } from '../../../generated/prisma/client';

export class CreateMerchantDto {
  @ApiProperty({ example: 'Acme Corp' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ enum: MerchantStatus, example: MerchantStatus.ACTIVE })
  @IsOptional()
  @IsEnum(MerchantStatus)
  status?: MerchantStatus;
}
