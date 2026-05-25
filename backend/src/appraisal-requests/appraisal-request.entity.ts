import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { AppraisalDisposition, AppraisalOrientation, OperationType, PropertyType } from '../common/enums';
import { Contact } from '../contacts/contact.entity';

@Entity('appraisal_requests')
@Index(['teamId'])
@Index(['contactId'])
@Index(['publicToken'], { unique: true })
export class AppraisalRequest {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  teamId: number;

  @Column()
  ownerUserId: number;

  @ManyToOne(() => Contact, (contact) => contact.appraisalRequests, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'contactId' })
  contact: Contact;

  @Column()
  contactId: number;

  @Column()
  publicToken: string;

  @Column({ type: 'timestamp with time zone' })
  expiresAt: Date;

  @Column({ type: 'timestamp with time zone', nullable: true })
  submittedAt: Date | null;

  @Column({ type: 'varchar', nullable: true })
  propertyAddress: string | null;

  @Column({ type: 'varchar', nullable: true })
  city: string | null;

  @Column({ type: 'varchar', nullable: true })
  neighborhood: string | null;

  @Column({ type: 'enum', enum: PropertyType, enumName: 'property_type', nullable: true })
  propertyType: PropertyType | null;

  @Column({ type: 'enum', enum: OperationType, enumName: 'operation_type', nullable: true })
  operationType: OperationType | null;

  @Column({ type: 'integer', nullable: true })
  rooms: number | null;

  @Column({ type: 'integer', nullable: true })
  bedrooms: number | null;

  @Column({ type: 'integer', nullable: true })
  bathrooms: number | null;

  @Column({ type: 'double precision', nullable: true })
  expenses: number | null;

  @Column({ type: 'integer', nullable: true })
  floor: number | null;

  @Column({ type: 'text', nullable: true })
  amenities: string | null;

  @Column({ type: 'enum', enum: AppraisalOrientation, enumName: 'appraisal_orientation', nullable: true })
  orientation: AppraisalOrientation | null;

  @Column({ type: 'enum', enum: AppraisalDisposition, enumName: 'appraisal_disposition', nullable: true })
  disposition: AppraisalDisposition | null;

  @Column({ type: 'integer', nullable: true })
  ageYears: number | null;

  @Column({ type: 'double precision', nullable: true })
  coveredArea: number | null;

  @Column({ type: 'double precision', nullable: true })
  semiCoveredArea: number | null;

  @Column({ type: 'double precision', nullable: true })
  uncoveredArea: number | null;

  @Column({ type: 'double precision', nullable: true })
  totalArea: number | null;

  @Column({ type: 'double precision', nullable: true })
  weightedArea: number | null;

  @Column({ type: 'boolean', nullable: true })
  hasGarage: boolean | null;

  @Column({ type: 'text', nullable: true })
  conditionNotes: string | null;

  @Column({ type: 'text', nullable: true })
  valuationReason: string | null;

  @Column({ type: 'text', nullable: true })
  availabilityNotes: string | null;

  @Column({ type: 'text', nullable: true })
  additionalNotes: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
