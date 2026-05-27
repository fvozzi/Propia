import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { AccountStatus } from '../../common/enums';

export class UpdateAdminAccountDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;

  @IsOptional()
  @IsEnum(AccountStatus)
  status?: AccountStatus;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  planName?: string | null;

  @IsOptional()
  @IsDateString()
  trialEndsAt?: string | null;

  @IsOptional()
  @IsDateString()
  paidUntil?: string | null;

  @IsOptional()
  @IsInt()
  @Min(1)
  maxUsers?: number | null;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  suspensionReason?: string | null;
}
