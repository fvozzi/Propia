import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { AppraisalDisposition, AppraisalOrientation, OperationType, PropertyType } from '../../common/enums';

function normalizeOptionalString(value: unknown) {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  return trimmed === '' ? undefined : trimmed;
}

export class AppraisalRequestBaseDto {
  @Transform(({ value }) => normalizeOptionalString(value))
  @IsString()
  @IsNotEmpty()
  propertyAddress: string;

  @Transform(({ value }) => normalizeOptionalString(value))
  @IsOptional()
  @IsString()
  city?: string;

  @Transform(({ value }) => normalizeOptionalString(value))
  @IsOptional()
  @IsString()
  neighborhood?: string;

  @IsOptional()
  @IsEnum(PropertyType)
  propertyType?: PropertyType;

  @IsOptional()
  @IsEnum(OperationType)
  operationType?: OperationType;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  rooms?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  bedrooms?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  bathrooms?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  expenses?: number;

  @IsOptional()
  @Transform(({ value }) => normalizeOptionalString(value))
  @IsString()
  @IsOptional()
  @MaxLength(50)
  floor?: string;

  @Transform(({ value }) => normalizeOptionalString(value))
  @IsOptional()
  @IsString()
  @MaxLength(500)
  amenities?: string;

  @IsOptional()
  @IsEnum(AppraisalOrientation)
  orientation?: AppraisalOrientation;

  @IsOptional()
  @IsEnum(AppraisalDisposition)
  disposition?: AppraisalDisposition;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  ageYears?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  coveredArea?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  semiCoveredArea?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  uncoveredArea?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  totalArea?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  weightedArea?: number;

  @IsOptional()
  @IsBoolean()
  hasGarage?: boolean;

  @Transform(({ value }) => normalizeOptionalString(value))
  @IsOptional()
  @IsString()
  conditionNotes?: string;

  @Transform(({ value }) => normalizeOptionalString(value))
  @IsOptional()
  @IsString()
  valuationReason?: string;

  @Transform(({ value }) => normalizeOptionalString(value))
  @IsOptional()
  @IsString()
  availabilityNotes?: string;

  @Transform(({ value }) => normalizeOptionalString(value))
  @IsOptional()
  @IsString()
  additionalNotes?: string;
}
