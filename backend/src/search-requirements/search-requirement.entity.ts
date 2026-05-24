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
  CurrencyType,
  OperationType,
  PropertyType,
  SearchRequirementStatus,
} from '../common/enums';
import { BuyerPropertyCandidate } from '../buyer-property-candidates/buyer-property-candidate.entity';
import { Contact } from '../contacts/contact.entity';
import { Property } from '../properties/property.entity';
import type {
  BuyerPropertyRequirementAgeRange,
  BuyerPropertyRequirementAmenity,
  BuyerPropertyRequirementRoomType,
} from '../use-cases/buyer-property-requirement.use-case';

@Entity('search_requirements')
export class SearchRequirement {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  teamId: number;

  @Column()
  ownerUserId: number;

  @ManyToOne(() => Contact, (contact) => contact.searchRequirements, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'contactId' })
  contact: Contact;

  @Column()
  contactId: number;

  @Column({ type: 'enum', enum: OperationType, enumName: 'operation_type' })
  operationType: OperationType;

  @Column({ type: 'enum', enum: PropertyType, enumName: 'property_type' })
  propertyType: PropertyType;

  @ManyToOne(() => Property, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'propertyId' })
  property?: Property | null;

  @Column({ type: 'integer', nullable: true })
  propertyId: number | null;

  @Column('text', { array: true, default: () => "'{}'" })
  neighborhoods: string[];

  @Column({ type: 'double precision', nullable: true })
  minPrice: number | null;

  @Column({ type: 'double precision', nullable: true })
  maxPrice: number | null;

  @Column({ type: 'enum', enum: CurrencyType, enumName: 'currency_type' })
  currency: CurrencyType;

  @Column({ type: 'int', nullable: true })
  minRooms: number | null;

  @Column({ type: 'int', nullable: true })
  minBedrooms: number | null;

  @Column({ type: 'int', nullable: true })
  minBathrooms: number | null;

  @Column({ type: 'boolean', default: false })
  needsParking: boolean;

  @Column({ type: 'boolean', default: false })
  creditEligible: boolean;

  @Column({ type: 'boolean', default: false })
  professionalUse: boolean;

  @Column({ type: 'boolean', default: false })
  accessible: boolean;

  @Column({ type: 'boolean', default: false })
  bright: boolean;

  @Column('text', { array: true, default: () => "'{}'" })
  amenities: BuyerPropertyRequirementAmenity[];

  @Column('text', { array: true, default: () => "'{}'" })
  roomTypes: BuyerPropertyRequirementRoomType[];

  @Column({ type: 'varchar', nullable: true })
  ageRange: BuyerPropertyRequirementAgeRange | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Column({
    type: 'enum',
    enum: SearchRequirementStatus,
    enumName: 'search_requirement_status',
  })
  status: SearchRequirementStatus;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => BuyerPropertyCandidate, (candidate) => candidate.searchRequirement)
  propertyCandidates: BuyerPropertyCandidate[];
}
