import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import {
  CurrencyType,
  ExpenseCategory,
  FinancialEntryType,
  FinancialIncomeType,
} from '../../common/enums';

export class CreateFinancialEntryDto {
  @IsEnum(FinancialEntryType)
  entryType: FinancialEntryType;

  @IsDateString()
  entryDate: string;

  @IsEnum(CurrencyType)
  currency: CurrencyType;

  @IsOptional()
  @IsEnum(FinancialIncomeType)
  incomeType?: FinancialIncomeType;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  amount?: number;

  @IsOptional()
  @IsEnum(ExpenseCategory)
  expenseCategory?: ExpenseCategory;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  activityId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  searchRequirementId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  commercialOpportunityId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  operationAmount?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  commissionPercent?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  agentParticipationPercent?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  franchisePercent?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}
