import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import {
  BuyerPropertyCandidateWorkflowStatus,
  BuyerPropertyShareStatus,
} from '../common/enums';
import { Contact } from '../contacts/contact.entity';
import { Property } from '../properties/property.entity';
import { SearchRequirement } from '../search-requirements/search-requirement.entity';

@Entity('buyer_property_candidates')
export class BuyerPropertyCandidate {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  teamId: number;

  @Column()
  ownerUserId: number;

  @ManyToOne(() => Contact, (contact) => contact.propertyCandidates, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'contactId' })
  contact: Contact;

  @Column()
  contactId: number;

  @ManyToOne(() => SearchRequirement, (requirement) => requirement.propertyCandidates, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'searchRequirementId' })
  searchRequirement: SearchRequirement | null;

  @Column({ type: 'integer', nullable: true })
  searchRequirementId: number | null;

  @ManyToOne(() => Property, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'propertyId' })
  property: Property | null;

  @Column({ type: 'integer', nullable: true })
  propertyId: number | null;

  @Column()
  portal: string;

  @Column()
  url: string;

  @Column()
  title: string;

  @Column({ type: 'text', nullable: true })
  internalNotes: string | null;

  @Column({ type: 'text', nullable: true })
  shareComments: string | null;

  @Column({
    type: 'enum',
    enum: BuyerPropertyCandidateWorkflowStatus,
    enumName: 'buyer_property_candidate_workflow_status',
    default: BuyerPropertyCandidateWorkflowStatus.TO_CONTACT,
  })
  workflowStatus: BuyerPropertyCandidateWorkflowStatus;

  @Column({ type: 'varchar', nullable: true })
  agentName: string | null;

  @Column({ type: 'varchar', nullable: true })
  agentWhatsapp: string | null;

  @Column({ type: 'text', nullable: true })
  proposedScheduleOptions: string | null;

  @Column({ type: 'timestamp with time zone', nullable: true })
  scheduledVisitAt: Date | null;

  @Column({ type: 'text', nullable: true })
  workflowNotes: string | null;

  @Column({ type: 'timestamp with time zone', nullable: true })
  lastContactedAt: Date | null;

  @Column({
    type: 'enum',
    enum: BuyerPropertyShareStatus,
    enumName: 'buyer_property_share_status',
  })
  shareStatus: BuyerPropertyShareStatus;

  @Column({ type: 'timestamp with time zone', nullable: true })
  sharedAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
