import { IsOptional, IsString } from 'class-validator';

export class ShareBuyerPropertyCandidateDto {
  @IsOptional()
  @IsString()
  shareComments?: string;
}
