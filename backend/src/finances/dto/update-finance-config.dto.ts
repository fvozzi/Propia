import { Type } from 'class-transformer';
import { IsNumber, Min } from 'class-validator';

export class UpdateFinanceConfigDto {
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  franchisePercent: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  saleCommissionPercent: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  purchaseCommissionPercent: number;
}
