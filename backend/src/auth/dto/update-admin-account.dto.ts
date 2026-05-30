import {
  IsBoolean,
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

  @IsOptional()
  @IsBoolean()
  whatsappEnabled?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  whatsappPhoneNumberId?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  whatsappBusinessAccountId?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  whatsappBusinessNumber?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  whatsappDisplayName?: string | null;

  @IsOptional()
  @IsString()
  whatsappAccessToken?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  whatsappTemplateLanguageCode?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  whatsappPropertySearchTemplateName?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  whatsappPropertySearchImageTemplateName?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  whatsappAppraisalTemplateName?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  whatsappQualityRating?: string | null;
}
