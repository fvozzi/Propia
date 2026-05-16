import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { TeamMembershipRole } from '../common/enums';
import { Team } from './team.entity';
import { User } from './user.entity';

@Entity('team_memberships')
@Index(['teamId', 'userId'], { unique: true })
export class TeamMembership {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  teamId: number;

  @Column()
  userId: number;

  @Column({
    type: 'enum',
    enum: TeamMembershipRole,
    enumName: 'team_membership_role',
    default: TeamMembershipRole.MEMBER,
  })
  role: TeamMembershipRole;

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => Team, (team) => team.memberships, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'teamId' })
  team: Team;

  @ManyToOne(() => User, (user) => user.memberships, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;
}
