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
import { AppUserRole } from '../common/enums';
import { GoogleCalendarConnection } from './google-calendar-connection.entity';
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

  @Column({ type: 'integer', nullable: true })
  activeTeamId: number | null;

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => Team, (team) => team.activeUsers, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'activeTeamId' })
  activeTeam: Team | null;

  @OneToMany(() => TeamMembership, (membership) => membership.user)
  memberships: TeamMembership[];

  @OneToOne(
    () => GoogleCalendarConnection,
    (googleCalendarConnection) => googleCalendarConnection.user,
  )
  googleCalendarConnection?: GoogleCalendarConnection;
}
