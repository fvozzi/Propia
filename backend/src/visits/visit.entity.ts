import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Contact } from '../contacts/contact.entity';
import { Property } from '../properties/property.entity';
import { VisitStatus } from '../common/enums';
import { SearchRequirement } from '../search-requirements/search-requirement.entity';
import { BuyerPropertyCandidate } from '../buyer-property-candidates/buyer-property-candidate.entity';

@Entity('visits')
export class Visit {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  teamId: number;

  @Column()
  ownerUserId: number;

  @ManyToOne(() => Property, (property) => property.visits, {
    nullable: true,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'propertyId' })
  property: Property | null;

  @Column({ nullable: true })
  propertyId: number | null;

  @ManyToOne(() => Contact, (contact) => contact.visits, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'contactId' })
  contact: Contact;

  @Column()
  contactId: number;

  @ManyToOne(() => Contact, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'colleagueContactId' })
  colleagueContact: Contact | null;

  @Column({ type: 'integer', nullable: true })
  colleagueContactId: number | null;

  @Column({ type: 'varchar', nullable: true })
  colleagueName: string | null;

  @Column({ type: 'varchar', nullable: true })
  colleagueWhatsapp: string | null;

  @ManyToOne(() => SearchRequirement, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'searchRequirementId' })
  searchRequirement: SearchRequirement | null;

  @Column({ type: 'integer', nullable: true })
  searchRequirementId: number | null;

  @ManyToOne(() => BuyerPropertyCandidate, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'buyerPropertyCandidateId' })
  buyerPropertyCandidate: BuyerPropertyCandidate | null;

  @Column({ type: 'integer', nullable: true })
  buyerPropertyCandidateId: number | null;

  @Column({ type: 'timestamp with time zone' })
  scheduledAt: Date;

  @Column({ type: 'enum', enum: VisitStatus, enumName: 'visit_status' })
  status: VisitStatus;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Column({ type: 'text', nullable: true })
  externalUrl: string | null;

  @Column({ type: 'varchar', nullable: true })
  externalPropertyTitle: string | null;

  @Column({ type: 'text', nullable: true })
  externalPropertyAddress: string | null;

  @Column({ type: 'varchar', nullable: true })
  googleEventId: string | null;

  @Column({ type: 'varchar', default: 'PENDING' })
  googleSyncStatus: string;

  @Column({ type: 'timestamp with time zone', nullable: true })
  lastSyncedAt: Date | null;

  @Column({ type: 'text', nullable: true })
  googleSyncError: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
