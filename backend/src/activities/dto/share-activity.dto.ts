import { IsOptional, IsString } from 'class-validator';

export class ShareActivityDto {
  @IsOptional()
  @IsString()
  whatsappComment?: string;
}
