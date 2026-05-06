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
  CurrencyType,
  OperationType,
  PropertyType,
  SearchRequirementStatus,
} from '../common/enums';
import { Contact } from '../contacts/contact.entity';

@Entity('search_requirements')
export class SearchRequirement {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Contact, (contact) => contact.searchRequirements, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'contactId' })
  contact: Contact;

  @Column()
  contactId: number;

  @Column({ type: 'enum', enum: OperationType, enumName: 'operation_type' })
  operationType: OperationType;

  @Column({ type: 'enum', enum: PropertyType, enumName: 'property_type' })
  propertyType: PropertyType;

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
}
