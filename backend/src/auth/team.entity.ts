import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { AccountStatus } from '../common/enums';
import { TeamMembership } from './team-membership.entity';
import { User } from './user.entity';

@Entity('teams')
export class Team {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({
    type: 'enum',
    enum: AccountStatus,
    enumName: 'account_status',
    default: AccountStatus.ACTIVE,
  })
  status: AccountStatus;

  @Column({ type: 'varchar', nullable: true })
  planName: string | null;

  @Column({ type: 'timestamp with time zone', nullable: true })
  trialEndsAt: Date | null;

  @Column({ type: 'timestamp with time zone', nullable: true })
  paidUntil: Date | null;

  @Column({ type: 'integer', nullable: true })
  maxUsers: number | null;

  @Column({ type: 'timestamp with time zone', nullable: true })
  suspendedAt: Date | null;

  @Column({ type: 'varchar', nullable: true })
  suspensionReason: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @OneToMany(() => TeamMembership, (membership) => membership.team)
  memberships: TeamMembership[];

  @OneToMany(() => User, (user) => user.activeTeam)
  activeUsers: User[];
}
