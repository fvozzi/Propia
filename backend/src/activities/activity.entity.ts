import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ActivityType } from '../common/enums';
import { AppraisalRequest } from '../appraisal-requests/appraisal-request.entity';
import { CommercialOpportunity } from '../commercial-opportunities/commercial-opportunity.entity';
import { Contact } from '../contacts/contact.entity';
import { Property } from '../properties/property.entity';

@Entity('activities')
export class Activity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  teamId: number;

  @Column()
  ownerUserId: number;

  @ManyToOne(() => Contact, (contact) => contact.activities, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'contactId' })
  contact: Contact | null;

  @Column({ type: 'integer', nullable: true })
  contactId: number | null;

  @ManyToOne(() => Property, (property) => property.activities, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'propertyId' })
  property: Property | null;

  @Column({ type: 'integer', nullable: true })
  propertyId: number | null;

  @ManyToOne(() => AppraisalRequest, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'appraisalRequestId' })
  appraisalRequest: AppraisalRequest | null;

  @Column({ type: 'integer', nullable: true })
  appraisalRequestId: number | null;

  @ManyToOne(
    () => CommercialOpportunity,
    (commercialOpportunity) => commercialOpportunity.activities,
    {
      nullable: true,
      onDelete: 'SET NULL',
    },
  )
  @JoinColumn({ name: 'commercialOpportunityId' })
  commercialOpportunity: CommercialOpportunity | null;

  @Column({ type: 'integer', nullable: true })
  commercialOpportunityId: number | null;

  @Column({ type: 'enum', enum: ActivityType, enumName: 'activity_type' })
  activityType: ActivityType;

  @Column()
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'varchar', nullable: true })
  externalUrl: string | null;

  @Column({ type: 'varchar', nullable: true })
  externalPreviewImageUrl: string | null;

  @Column({ type: 'varchar', nullable: true })
  externalPreviewTitle: string | null;

  @Column({ type: 'text', nullable: true })
  externalPreviewDescription: string | null;

  @Column({ type: 'varchar', nullable: true })
  externalPreviewDomain: string | null;

  @Column({ type: 'timestamp with time zone', nullable: true })
  externalPreviewFetchedAt: Date | null;

  @Column({ type: 'text', nullable: true })
  whatsappComment: string | null;

  @Column({ type: 'timestamp with time zone', nullable: true })
  whatsappSharedAt: Date | null;

  @Column({ type: 'boolean', nullable: true })
  propertySearchLiked: boolean | null;

  @Column({ type: 'varchar', nullable: true })
  googleEventId: string | null;

  @Column({ type: 'varchar', default: 'PENDING' })
  googleSyncStatus: string;

  @Column({ type: 'timestamp with time zone', nullable: true })
  lastSyncedAt: Date | null;

  @Column({ type: 'text', nullable: true })
  googleSyncError: string | null;

  @Column({ type: 'timestamp with time zone' })
  activityDate: Date;

  @Column({ type: 'timestamp with time zone', nullable: true })
  nextFollowUpDate: Date | null;

  @CreateDateColumn()
  createdAt: Date;
}
