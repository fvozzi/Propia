import { Type } from 'class-transformer';
import { IsBoolean, IsEnum, IsInt, IsObject, IsOptional, IsString, IsUrl, Min } from 'class-validator';
import { PortalProviderKey } from '../../common/enums';

export class CreatePortalSourceConfigDto {
  @IsEnum(PortalProviderKey)
  providerKey: PortalProviderKey;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  priority?: number;

  @IsOptional()
  @IsUrl({
    require_protocol: true,
  })
  baseUrl?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  rateLimitPerHour?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  maxResultsPerRun?: number;

  @IsOptional()
  @IsBoolean()
  requiresAuth?: boolean;

  @IsOptional()
  @IsObject()
  authConfig?: Record<string, unknown>;
}
