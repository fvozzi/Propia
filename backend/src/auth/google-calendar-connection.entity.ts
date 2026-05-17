import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from './user.entity';

@Entity('google_calendar_connections')
export class GoogleCalendarConnection {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'integer', unique: true })
  userId: number;

  @OneToOne(() => User, (user) => user.googleCalendarConnection, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ type: 'varchar' })
  googleSub: string;

  @Column({ type: 'varchar' })
  email: string;

  @Column({ type: 'varchar', default: 'primary' })
  calendarId: string;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'text', nullable: true })
  accessToken: string | null;

  @Column({ type: 'text', nullable: true })
  refreshToken: string | null;

  @Column({ type: 'text', nullable: true })
  scope: string | null;

  @Column({ type: 'varchar', nullable: true })
  tokenType: string | null;

  @Column({ type: 'bigint', nullable: true })
  expiryDate: number | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
