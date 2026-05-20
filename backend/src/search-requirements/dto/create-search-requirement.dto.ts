import { Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';
import {
  CurrencyType,
  OperationType,
  PropertyType,
  SearchRequirementStatus,
} from '../../common/enums';

export class CreateSearchRequirementDto {
  @Type(() => Number)
  @IsInt()
  contactId: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  propertyId?: number;

  @IsEnum(OperationType)
  operationType: OperationType;

  @IsEnum(PropertyType)
  propertyType: PropertyType;

  @IsArray()
  @IsString({ each: true })
  neighborhoods: string[];

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  minPrice?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  maxPrice?: number;

  @IsEnum(CurrencyType)
  currency: CurrencyType;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  minRooms?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  minBedrooms?: number;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsEnum(SearchRequirementStatus)
  status: SearchRequirementStatus;
}
