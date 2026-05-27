import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { AppUserRole, UserStatus } from '../common/enums';
import { GoogleCalendarConnection } from './google-calendar-connection.entity';
import { LoginEvent } from './login-event.entity';
import { TeamMembership } from './team-membership.entity';
import { Team } from './team.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  email: string;

  @Column({ type: 'varchar', nullable: true })
  passwordHash: string | null;

  @Column()
  name: string;

  @Column({
    type: 'enum',
    enum: AppUserRole,
    enumName: 'app_user_role',
    default: AppUserRole.USER,
  })
  appRole: AppUserRole;

  @Column({ type: 'boolean', default: false })
  backofficeAccess: boolean;

  @Column({
    type: 'enum',
    enum: UserStatus,
    enumName: 'user_status',
    default: UserStatus.ACTIVE,
  })
  status: UserStatus;

  @Column({ type: 'integer', nullable: true })
  activeTeamId: number | null;

  @Column({ type: 'timestamp with time zone', nullable: true })
  lastLoginAt: Date | null;

  @Column({ type: 'integer', default: 0 })
  loginCount: number;

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => Team, (team) => team.activeUsers, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'activeTeamId' })
  activeTeam: Team | null;

  @OneToMany(() => TeamMembership, (membership) => membership.user)
  memberships: TeamMembership[];

  @OneToMany(() => LoginEvent, (loginEvent) => loginEvent.user)
  loginEvents: LoginEvent[];

  @OneToOne(
    () => GoogleCalendarConnection,
    (googleCalendarConnection) => googleCalendarConnection.user,
  )
  googleCalendarConnection?: GoogleCalendarConnection;
}
