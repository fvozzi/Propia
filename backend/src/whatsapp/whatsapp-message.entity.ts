import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Activity } from '../activities/activity.entity';
import { WhatsappMessageDirection, WhatsappMessageStatus } from '../common/enums';
import { Contact } from '../contacts/contact.entity';
import { Team } from '../auth/team.entity';

@Entity('whatsapp_messages')
export class WhatsappMessage {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  teamId: number;

  @Column({ type: 'integer', nullable: true })
  contactId: number | null;

  @Column({ type: 'integer', nullable: true })
  activityId: number | null;

  @Column({
    type: 'enum',
    enum: WhatsappMessageDirection,
    enumName: 'whatsapp_message_direction',
  })
  direction: WhatsappMessageDirection;

  @Column({ type: 'varchar' })
  messageType: string;

  @Column({ type: 'varchar', nullable: true })
  templateName: string | null;

  @Column({ type: 'varchar', nullable: true })
  templateLanguage: string | null;

  @Column({ type: 'varchar' })
  toPhone: string;

  @Column({ type: 'varchar', nullable: true })
  waMessageId: string | null;

  @Column({
    type: 'enum',
    enum: WhatsappMessageStatus,
    enumName: 'whatsapp_message_status',
    default: WhatsappMessageStatus.PENDING,
  })
  status: WhatsappMessageStatus;

  @Column({ type: 'jsonb', nullable: true })
  payload: Record<string, unknown> | null;

  @Column({ type: 'jsonb', nullable: true })
  statusPayload: Record<string, unknown> | null;

  @Column({ type: 'text', nullable: true })
  errorMessage: string | null;

  @Column({ type: 'timestamp with time zone', nullable: true })
  sentAt: Date | null;

  @Column({ type: 'timestamp with time zone', nullable: true })
  deliveredAt: Date | null;

  @Column({ type: 'timestamp with time zone', nullable: true })
  readAt: Date | null;

  @Column({ type: 'timestamp with time zone', nullable: true })
  failedAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => Team, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'teamId' })
  team: Team;

  @ManyToOne(() => Contact, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'contactId' })
  contact: Contact | null;

  @ManyToOne(() => Activity, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'activityId' })
  activity: Activity | null;
}
