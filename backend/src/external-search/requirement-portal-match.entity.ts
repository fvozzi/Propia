import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Activity } from '../activities/activity.entity';
import { BuyerPropertyCandidate } from '../buyer-property-candidates/buyer-property-candidate.entity';
import { ExternalListing } from './external-listing.entity';
import { SearchRequirement } from '../search-requirements/search-requirement.entity';

@Entity('requirement_portal_matches')
export class RequirementPortalMatch {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  teamId: number;

  @Column()
  searchRequirementId: number;

  @ManyToOne(() => SearchRequirement, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'searchRequirementId' })
  searchRequirement: SearchRequirement;

  @Column()
  externalListingId: number;

  @ManyToOne(() => ExternalListing, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'externalListingId' })
  externalListing: ExternalListing;

  @Column({ type: 'int' })
  score: number;

  @Column({ type: 'jsonb' })
  scoreBreakdown: Record<string, number>;

  @Column('text', { array: true, default: () => "'{}'" })
  matchReasons: string[];

  @Column({ type: 'boolean', default: false })
  dismissed: boolean;

  @Column({ type: 'text', nullable: true })
  dismissedReason: string | null;

  @Column({ type: 'timestamp with time zone', nullable: true })
  dismissedAt: Date | null;

  @Column({ type: 'integer', nullable: true })
  buyerPropertyCandidateId: number | null;

  @ManyToOne(() => BuyerPropertyCandidate, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'buyerPropertyCandidateId' })
  buyerPropertyCandidate: BuyerPropertyCandidate | null;

  @Column({ type: 'timestamp with time zone', nullable: true })
  convertedToCandidateAt: Date | null;

  @Column({ type: 'integer', nullable: true })
  activityId: number | null;

  @ManyToOne(() => Activity, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'activityId' })
  activity: Activity | null;

  @Column({ type: 'timestamp with time zone', nullable: true })
  createdActivityAt: Date | null;

  @Column({ type: 'timestamp with time zone' })
  lastEvaluatedAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
