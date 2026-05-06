import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ActivityType } from '../common/enums';
import { Contact } from '../contacts/contact.entity';
import { Property } from '../properties/property.entity';

@Entity('activities')
export class Activity {
  @PrimaryGeneratedColumn()
  id: number;

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

  @Column({ type: 'enum', enum: ActivityType, enumName: 'activity_type' })
  activityType: ActivityType;

  @Column()
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'timestamp with time zone' })
  activityDate: Date;

  @Column({ type: 'timestamp with time zone', nullable: true })
  nextFollowUpDate: Date | null;

  @CreateDateColumn()
  createdAt: Date;
}
