import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import {
  CurrencyType,
  ExternalListingStatus,
  OperationType,
  PortalProviderKey,
  PropertyType,
} from '../common/enums';

@Entity('external_listings')
export class ExternalListing {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  teamId: number;

  @Column({
    type: 'enum',
    enum: PortalProviderKey,
    enumName: 'portal_provider_key',
  })
  providerKey: PortalProviderKey;

  @Column({ type: 'varchar', nullable: true })
  externalListingId: string | null;

  @Column()
  canonicalUrl: string;

  @Column()
  urlHash: string;

  @Column()
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'enum', enum: OperationType, enumName: 'operation_type' })
  operationType: OperationType;

  @Column({ type: 'enum', enum: PropertyType, enumName: 'property_type' })
  propertyType: PropertyType;

  @Column({ type: 'double precision', nullable: true })
  price: number | null;

  @Column({ type: 'enum', enum: CurrencyType, enumName: 'currency_type' })
  currency: CurrencyType;

  @Column({ type: 'double precision', nullable: true })
  expenses: number | null;

  @Column({ type: 'varchar', nullable: true })
  address: string | null;

  @Column({ type: 'varchar', nullable: true })
  city: string | null;

  @Column({ type: 'varchar', nullable: true })
  neighborhood: string | null;

  @Column({ type: 'int', nullable: true })
  rooms: number | null;

  @Column({ type: 'int', nullable: true })
  bedrooms: number | null;

  @Column({ type: 'int', nullable: true })
  bathrooms: number | null;

  @Column({ type: 'boolean', nullable: true })
  hasGarage: boolean | null;

  @Column({ type: 'double precision', nullable: true })
  coveredArea: number | null;

  @Column({ type: 'double precision', nullable: true })
  totalArea: number | null;

  @Column({ type: 'timestamp with time zone', nullable: true })
  sourcePublishedAt: Date | null;

  @Column({ type: 'timestamp with time zone' })
  firstSeenAt: Date;

  @Column({ type: 'timestamp with time zone' })
  lastSeenAt: Date;

  @Column({ type: 'jsonb', nullable: true })
  rawPayload: Record<string, unknown> | null;

  @Column({
    type: 'enum',
    enum: ExternalListingStatus,
    enumName: 'external_listing_status',
    default: ExternalListingStatus.ACTIVE,
  })
  status: ExternalListingStatus;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
