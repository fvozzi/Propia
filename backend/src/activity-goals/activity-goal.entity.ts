import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { ActivityType } from '../common/enums';

@Entity('activity_goals')
@Unique('UQ_activity_goals_team_activity_type', ['teamId', 'activityType'])
export class ActivityGoal {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  teamId: number;

  @Column({ type: 'enum', enum: ActivityType, enumName: 'activity_type' })
  activityType: ActivityType;

  @Column({ type: 'integer' })
  targetCount: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
