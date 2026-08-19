import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

export type BackupStorageProvider = 'LOCAL';
export type SystemBackupLastStatus = 'RUNNING' | 'SUCCESS' | 'FAILED';

@Entity('system_backup_configs')
export class SystemBackupConfig {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'boolean', default: true })
  backupsEnabled: boolean;

  @Column({ type: 'varchar', default: 'LOCAL' })
  storageProvider: BackupStorageProvider;

  @Column({ type: 'integer', default: 30 })
  retentionCount: number;

  @Column({ type: 'integer', default: 3 })
  scheduleHourUtc: number;

  @Column({ type: 'integer', default: 0 })
  scheduleMinuteUtc: number;

  @Column({ type: 'timestamp with time zone', nullable: true })
  lastBackupStartedAt: Date | null;

  @Column({ type: 'timestamp with time zone', nullable: true })
  lastBackupFinishedAt: Date | null;

  @Column({ type: 'varchar', nullable: true })
  lastBackupStatus: SystemBackupLastStatus | null;

  @Column({ type: 'text', nullable: true })
  lastBackupError: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
