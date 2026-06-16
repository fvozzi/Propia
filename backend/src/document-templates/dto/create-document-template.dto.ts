import { IsEnum, IsOptional, IsString } from 'class-validator';
import { DocumentTemplatePresetKey } from '../../common/enums';

export class CreateDocumentTemplateDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(DocumentTemplatePresetKey)
  presetKey?: DocumentTemplatePresetKey;

  @IsOptional()
  @IsString()
  fieldDefinitionsJson?: string;

  @IsOptional()
  @IsString()
  htmlContent?: string;
}
