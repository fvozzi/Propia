import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Team } from './team.entity';
import { User } from './user.entity';

export type LoginMethod = 'PASSWORD' | 'GOOGLE' | 'SUPPORT_IMPERSONATION';

@Entity('login_events')
export class LoginEvent {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar' })
  email: string;

  @Column({ type: 'integer', nullable: true })
  userId: number | null;

  @Column({ type: 'integer', nullable: true })
  actorUserId: number | null;

  @Column({ type: 'integer', nullable: true })
  teamId: number | null;

  @Column({ type: 'boolean', default: false })
  success: boolean;

  @Column({ type: 'varchar' })
  authMethod: LoginMethod;

  @Column({ type: 'varchar', nullable: true })
  ipAddress: string | null;

  @Column({ type: 'text', nullable: true })
  userAgent: string | null;

  @Column({ type: 'varchar', nullable: true })
  failureReason: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'userId' })
  user: User | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'actorUserId' })
  actorUser: User | null;

  @ManyToOne(() => Team, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'teamId' })
  team: Team | null;
}
