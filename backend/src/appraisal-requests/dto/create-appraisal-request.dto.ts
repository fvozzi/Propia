import { Type } from 'class-transformer';
import { IsInt } from 'class-validator';
import { AppraisalRequestBaseDto } from './appraisal-request-base.dto';

export class CreateAppraisalRequestDto extends AppraisalRequestBaseDto {
  @Type(() => Number)
  @IsInt()
  contactId: number;
}
