import { Type } from 'class-transformer';
import {
  IsBoolean,
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
import {
  buyerPropertyRequirementAgeRangeOptions,
  buyerPropertyRequirementAmenityOptions,
  buyerPropertyRequirementRoomTypeOptions,
} from '../../use-cases/buyer-property-requirement.use-case';

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
  @Type(() => Number)
  @IsInt()
  minBathrooms?: number;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  needsParking?: boolean;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  creditEligible?: boolean;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  professionalUse?: boolean;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  accessible?: boolean;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  bright?: boolean;

  @IsOptional()
  @Type(() => String)
  @IsArray()
  @IsEnum(buyerPropertyRequirementAmenityOptions, { each: true })
  amenities?: Array<(typeof buyerPropertyRequirementAmenityOptions)[number]>;

  @IsOptional()
  @Type(() => String)
  @IsArray()
  @IsEnum(buyerPropertyRequirementRoomTypeOptions, { each: true })
  roomTypes?: Array<(typeof buyerPropertyRequirementRoomTypeOptions)[number]>;

  @IsOptional()
  @IsEnum(buyerPropertyRequirementAgeRangeOptions)
  ageRange?: (typeof buyerPropertyRequirementAgeRangeOptions)[number];

  @IsOptional()
  @IsString()
  notes?: string;

  @IsEnum(SearchRequirementStatus)
  status: SearchRequirementStatus;
}
