import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import {
  CommercialOpportunityStage,
  CommercialOpportunityStatus,
  OperationType,
} from '../common/enums';
import { Activity } from '../activities/activity.entity';
import { AppraisalRequest } from '../appraisal-requests/appraisal-request.entity';
import { Contact } from '../contacts/contact.entity';
import { FinancialEntry } from '../finances/financial-entry.entity';
import { Property } from '../properties/property.entity';
import { SearchRequirement } from '../search-requirements/search-requirement.entity';

@Entity('commercial_opportunities')
export class CommercialOpportunity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  teamId: number;

  @Column()
  ownerUserId: number;

  @ManyToOne(() => Contact, (contact) => contact.commercialOpportunities, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'contactId' })
  contact: Contact;

  @Column()
  contactId: number;

  @Column({ type: 'enum', enum: OperationType, enumName: 'operation_type' })
  operationType: OperationType;

  @Column({
    type: 'enum',
    enum: CommercialOpportunityStage,
    enumName: 'commercial_opportunity_stage',
  })
  stage: CommercialOpportunityStage;

  @Column({
    type: 'enum',
    enum: CommercialOpportunityStatus,
    enumName: 'commercial_opportunity_status',
  })
  status: CommercialOpportunityStatus;

  @ManyToOne(() => Activity, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'sourceActivityId' })
  sourceActivity: Activity | null;

  @Column({ type: 'integer', nullable: true })
  sourceActivityId: number | null;

  @ManyToOne(() => SearchRequirement, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'searchRequirementId' })
  searchRequirement: SearchRequirement | null;

  @Column({ type: 'integer', nullable: true })
  searchRequirementId: number | null;

  @ManyToOne(() => AppraisalRequest, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'appraisalRequestId' })
  appraisalRequest: AppraisalRequest | null;

  @Column({ type: 'integer', nullable: true })
  appraisalRequestId: number | null;

  @ManyToOne(() => Property, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'propertyId' })
  property: Property | null;

  @Column({ type: 'integer', nullable: true })
  propertyId: number | null;

  @Column()
  title: string;

  @Column({ type: 'text', nullable: true })
  summary: string | null;

  @Column({ type: 'text', nullable: true })
  lostReason: string | null;

  @Column({ type: 'timestamp with time zone', nullable: true })
  closedAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => Activity, (activity) => activity.commercialOpportunity)
  activities: Activity[];

  @OneToMany(() => FinancialEntry, (entry) => entry.commercialOpportunity)
  financialEntries: FinancialEntry[];
}
