import { Type } from 'class-transformer';
import { IsBoolean, IsEnum, IsInt, IsOptional, Min } from 'class-validator';
import { PortalProviderKey } from '../../common/enums';

export class QueryRequirementPortalMatchesDto {
  @IsOptional()
  @IsEnum(PortalProviderKey)
  providerKey?: PortalProviderKey;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  minScore?: number;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  dismissed?: boolean;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  converted?: boolean;
}
