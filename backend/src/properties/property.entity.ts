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
import { Activity } from '../activities/activity.entity';
import {
  AppraisalDisposition,
  AppraisalOrientation,
  CurrencyType,
  OperationType,
  PropertyStatus,
  PropertyType,
} from '../common/enums';
import { AppraisalRequest } from '../appraisal-requests/appraisal-request.entity';
import { Contact } from '../contacts/contact.entity';
import { Visit } from '../visits/visit.entity';
import { PropertyPhoto } from './property-photo.entity';

@Entity('properties')
export class Property {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  teamId: number;

  @Column()
  ownerUserId: number;

  @Column()
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column()
  address: string;

  @Column()
  city: string;

  @Column({ type: 'varchar', nullable: true })
  neighborhood: string | null;

  @Column({ type: 'enum', enum: OperationType, enumName: 'operation_type' })
  operationType: OperationType;

  @Column({ type: 'enum', enum: PropertyType, enumName: 'property_type' })
  propertyType: PropertyType;

  @Column({ type: 'enum', enum: PropertyStatus, enumName: 'property_status' })
  status: PropertyStatus;

  @Column({ type: 'double precision', nullable: true })
  price: number | null;

  @Column({ type: 'enum', enum: CurrencyType, enumName: 'currency_type' })
  currency: CurrencyType;

  @Column({ type: 'double precision', nullable: true })
  expenses: number | null;

  @Column({ type: 'int', nullable: true })
  bedrooms: number | null;

  @Column({ type: 'int', nullable: true })
  bathrooms: number | null;

  @Column({ type: 'int', nullable: true })
  rooms: number | null;

  @Column({ type: 'double precision', nullable: true })
  coveredArea: number | null;

  @Column({ type: 'double precision', nullable: true })
  totalArea: number | null;

  @Column({ type: 'double precision', nullable: true })
  semiCoveredArea: number | null;

  @Column({ type: 'double precision', nullable: true })
  uncoveredArea: number | null;

  @Column({ type: 'double precision', nullable: true })
  weightedArea: number | null;

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

  @Column({ type: 'boolean', nullable: true })
  hasGarage: boolean | null;

  @ManyToOne(() => Contact, (contact) => contact.ownedProperties, { nullable: true })
  @JoinColumn({ name: 'ownerContactId' })
  ownerContact: Contact | null;

  @Column({ type: 'integer', nullable: true })
  ownerContactId: number | null;

  @OneToMany(() => Activity, (activity) => activity.property)
  activities: Activity[];

  @OneToMany(() => Visit, (visit) => visit.property)
  visits: Visit[];

  @ManyToOne(() => AppraisalRequest, (appraisalRequest) => appraisalRequest.properties, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'appraisalRequestId' })
  appraisalRequest: AppraisalRequest | null;

  @Column({ type: 'integer', nullable: true, unique: true })
  appraisalRequestId: number | null;

  @Column({ type: 'text', nullable: true })
  privateNotes: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => PropertyPhoto, (photo) => photo.property, {
    cascade: true,
    eager: true,
  })
  photos: PropertyPhoto[];
}
