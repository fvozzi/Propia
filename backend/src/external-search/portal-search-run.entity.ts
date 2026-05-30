import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { PortalProviderKey, PortalSearchRunStatus } from '../common/enums';
import { SearchRequirement } from '../search-requirements/search-requirement.entity';

@Entity('portal_search_runs')
export class PortalSearchRun {
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

  @Column()
  searchRequirementId: number;

  @ManyToOne(() => SearchRequirement, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'searchRequirementId' })
  searchRequirement: SearchRequirement;

  @Column({
    type: 'enum',
    enum: PortalSearchRunStatus,
    enumName: 'portal_search_run_status',
  })
  status: PortalSearchRunStatus;

  @Column({ type: 'timestamp with time zone' })
  startedAt: Date;

  @Column({ type: 'timestamp with time zone', nullable: true })
  finishedAt: Date | null;

  @Column({ type: 'int', default: 0 })
  fetchedCount: number;

  @Column({ type: 'int', default: 0 })
  normalizedCount: number;

  @Column({ type: 'int', default: 0 })
  matchedCount: number;

  @Column({ type: 'text', nullable: true })
  errorMessage: string | null;

  @Column({ type: 'jsonb', nullable: true })
  requestSnapshot: Record<string, unknown> | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
