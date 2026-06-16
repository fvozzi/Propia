import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { DocumentTemplatePresetKey } from '../common/enums';

@Entity('document_templates')
export class DocumentTemplate {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  teamId: number;

  @Column()
  ownerUserId: number;

  @Column()
  name: string;

  @Column({ type: 'varchar', nullable: true })
  description: string | null;

  @Column({
    type: 'enum',
    enum: DocumentTemplatePresetKey,
    enumName: 'document_template_preset_key',
    default: DocumentTemplatePresetKey.CUSTOM,
  })
  presetKey: DocumentTemplatePresetKey;

  @Column({ type: 'varchar', nullable: true })
  sourceFileName: string | null;

  @Column({ type: 'varchar', nullable: true })
  sourceFilePath: string | null;

  @Column({ type: 'text', nullable: true })
  htmlContent: string | null;

  @Column({ type: 'jsonb', default: () => "'[]'" })
  fieldDefinitions: DocumentTemplateFieldDefinition[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

export type DocumentTemplateFieldType =
  | 'text'
  | 'textarea'
  | 'number'
  | 'date'
  | 'select';

export type DocumentTemplateFieldDefinition = {
  key: string;
  label: string;
  type: DocumentTemplateFieldType;
  required?: boolean;
  placeholder?: string;
  helpText?: string;
  options?: Array<{
    label: string;
    value: string;
  }>;
};
