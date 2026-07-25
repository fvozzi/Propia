import { IsIn, IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

const contactValuePresenceOptions = ['WITH_VALUE', 'WITHOUT_VALUE'] as const;
const nextContactStatusOptions = [
  'WITH_VALUE',
  'WITHOUT_VALUE',
  'OVERDUE',
] as const;
const contactSortByOptions = ['UPDATED_AT', 'DISPLAY_NAME'] as const;
const contactSortDirectionOptions = ['ASC', 'DESC'] as const;

export class QueryContactsDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  displayName?: string;

  @IsOptional()
  @IsString()
  role?: string;

  @IsOptional()
  @IsString()
  birthdayMonth?: string;

  @IsOptional()
  @IsString()
  tag?: string;

  @IsOptional()
  @IsIn(contactValuePresenceOptions)
  lastContact?: (typeof contactValuePresenceOptions)[number];

  @IsOptional()
  @IsIn(nextContactStatusOptions)
  nextContact?: (typeof nextContactStatusOptions)[number];

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsIn(contactSortByOptions)
  sortBy?: (typeof contactSortByOptions)[number];

  @IsOptional()
  @IsIn(contactSortDirectionOptions)
  sortDirection?: (typeof contactSortDirectionOptions)[number];
}
