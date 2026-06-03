import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { WalletStatus } from '../../../generated/prisma/client';

export class UpdateWalletStatusDto {
  @ApiProperty({ enum: WalletStatus, example: WalletStatus.INACTIVE })
  @IsEnum(WalletStatus)
  status: WalletStatus;
}
