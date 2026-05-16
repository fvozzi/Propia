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

@Entity('visits')
export class Visit {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  teamId: number;

  @Column()
  ownerUserId: number;

  @ManyToOne(() => Property, (property) => property.visits, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'propertyId' })
  property: Property;

  @Column()
  propertyId: number;

  @ManyToOne(() => Contact, (contact) => contact.visits, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'contactId' })
  contact: Contact;

  @Column()
  contactId: number;

  @Column({ type: 'timestamp with time zone' })
  scheduledAt: Date;

  @Column({ type: 'enum', enum: VisitStatus, enumName: 'visit_status' })
  status: VisitStatus;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

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
