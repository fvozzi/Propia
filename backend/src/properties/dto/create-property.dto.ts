import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsArray,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import {
  CurrencyType,
  OperationType,
  PropertyStatus,
  PropertyType,
  AppraisalDisposition,
  AppraisalOrientation,
} from '../../common/enums';

class PropertyPhotoInput {
  @IsString()
  url: string;

  @IsOptional()
  @IsString()
  thumbnailUrl?: string;

  @IsOptional()
  @IsString()
  caption?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  orderIndex?: number;
}

export class CreatePropertyDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsString()
  address: string;

  @IsString()
  city: string;

  @IsOptional()
  @IsString()
  neighborhood?: string;

  @IsEnum(OperationType)
  operationType: OperationType;

  @IsEnum(PropertyType)
  propertyType: PropertyType;

  @IsEnum(PropertyStatus)
  status: PropertyStatus;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  price?: number;

  @IsEnum(CurrencyType)
  currency: CurrencyType;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  expenses?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  bedrooms?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  bathrooms?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  rooms?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  coveredArea?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  totalArea?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  semiCoveredArea?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  uncoveredArea?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  weightedArea?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  floor?: number;

  @IsOptional()
  @IsString()
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
  ageYears?: number;

  @IsOptional()
  @IsBoolean()
  hasGarage?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  ownerContactId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  appraisalRequestId?: number;

  @IsOptional()
  @IsString()
  privateNotes?: string;

  @IsOptional()
  @IsString()
  publicationUrl?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PropertyPhotoInput)
  photos?: PropertyPhotoInput[];
}
