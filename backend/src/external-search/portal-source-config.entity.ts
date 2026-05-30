import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { PortalProviderKey } from '../common/enums';

@Entity('portal_source_configs')
export class PortalSourceConfig {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  teamId: number;

  @Column({
    type: 'enum',
    enum: PortalProviderKey,
    enumName: 'portal_provider_key',
  })
  providerKey: PortalProviderKey;

  @Column({ type: 'boolean', default: true })
  enabled: boolean;

  @Column({ type: 'int', default: 100 })
  priority: number;

  @Column({ type: 'varchar', nullable: true })
  baseUrl: string | null;

  @Column({ type: 'int', nullable: true })
  rateLimitPerHour: number | null;

  @Column({ type: 'int', nullable: true })
  maxResultsPerRun: number | null;

  @Column({ type: 'boolean', default: false })
  requiresAuth: boolean;

  @Column({ type: 'jsonb', nullable: true })
  authConfig: Record<string, unknown> | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
