import { PartialType } from '@nestjs/mapped-types';
import { CreatePortalSourceConfigDto } from './create-portal-source-config.dto';

export class UpdatePortalSourceConfigDto extends PartialType(CreatePortalSourceConfigDto) {}
