import { Type } from 'class-transformer';
import { IsDateString, IsEnum, IsInt, IsOptional, IsString, IsUrl } from 'class-validator';
import { VisitStatus } from '../../common/enums';

export class CreateVisitDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  propertyId?: number | null;

  @Type(() => Number)
  @IsInt()
  contactId: number;

  @IsDateString()
  scheduledAt: string;

  @IsEnum(VisitStatus)
  status: VisitStatus;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsUrl({
    require_protocol: true,
  })
  externalUrl?: string;

  @IsOptional()
  @IsString()
  externalPropertyTitle?: string;

  @IsOptional()
  @IsString()
  externalPropertyAddress?: string;
}
