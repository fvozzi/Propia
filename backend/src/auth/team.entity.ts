import {
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  Column,
} from 'typeorm';
import { TeamMembership } from './team-membership.entity';
import { User } from './user.entity';

@Entity('teams')
export class Team {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @CreateDateColumn()
  createdAt: Date;

  @OneToMany(() => TeamMembership, (membership) => membership.team)
  memberships: TeamMembership[];

  @OneToMany(() => User, (user) => user.activeTeam)
  activeUsers: User[];
}
