import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional } from 'class-validator';
import {
  CommercialOpportunityStage,
  CommercialOpportunityStatus,
  OperationType,
} from '../../common/enums';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

export class QueryCommercialOpportunitiesDto extends PaginationQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  contactId?: number;

  @IsOptional()
  @IsEnum(OperationType)
  operationType?: OperationType;

  @IsOptional()
  @IsEnum(CommercialOpportunityStage)
  stage?: CommercialOpportunityStage;

  @IsOptional()
  @IsEnum(CommercialOpportunityStatus)
  status?: CommercialOpportunityStatus;
}
