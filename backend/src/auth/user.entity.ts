import {
  Column,
  CreateDateColumn,
  Entity,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { GoogleCalendarConnection } from './google-calendar-connection.entity';

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

  @CreateDateColumn()
  createdAt: Date;

  @OneToOne(
    () => GoogleCalendarConnection,
    (googleCalendarConnection) => googleCalendarConnection.user,
  )
  googleCalendarConnection?: GoogleCalendarConnection;
}
