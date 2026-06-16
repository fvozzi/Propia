import { Type } from 'class-transformer';
import { IsInt, IsObject, IsOptional } from 'class-validator';

export class GenerateDocumentTemplateDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  contactId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  propertyId?: number;

  @IsOptional()
  @IsObject()
  manualFields?: Record<string, unknown>;
}
