import { IsOptional, IsString } from 'class-validator';

export class DismissRequirementPortalMatchDto {
  @IsOptional()
  @IsString()
  reason?: string;
}
