import { PartialType } from '@nestjs/mapped-types';
import { CreateAppraisalRequestDto } from './create-appraisal-request.dto';

export class UpdateAppraisalRequestDto extends PartialType(CreateAppraisalRequestDto) {}
