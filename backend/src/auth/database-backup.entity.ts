import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from './user.entity';

export type DatabaseBackupTriggerType = 'MANUAL' | 'SCHEDULED';
export type DatabaseBackupStatus = 'RUNNING' | 'SUCCESS' | 'FAILED';
export type DatabaseBackupStorageProvider = 'LOCAL';

@Entity('database_backups')
export class DatabaseBackup {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar' })
  triggerType: DatabaseBackupTriggerType;

  @Column({ type: 'varchar' })
  status: DatabaseBackupStatus;

  @Column({ type: 'varchar', default: 'LOCAL' })
  storageProvider: DatabaseBackupStorageProvider;

  @Column({ type: 'integer', nullable: true })
  createdByUserId: number | null;

  @Column({ type: 'varchar', nullable: true })
  fileName: string | null;

  @Column({ type: 'text', nullable: true })
  filePath: string | null;

  @Column({ type: 'bigint', nullable: true })
  fileSizeBytes: string | null;

  @Column({ type: 'text', nullable: true })
  errorMessage: string | null;

  @Column({ type: 'timestamp with time zone', nullable: true })
  finishedAt: Date | null;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  startedAt: Date;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'createdByUserId' })
  createdByUser: User | null;
}
