import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

export class QueryAppraisalRequestsDto extends PaginationQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  contactId?: number;

  @IsOptional()
  @IsIn(['OPEN', 'COMPLETED', 'EXPIRED'])
  status?: 'OPEN' | 'COMPLETED' | 'EXPIRED';
}
