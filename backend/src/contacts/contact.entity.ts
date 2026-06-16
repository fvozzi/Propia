import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Activity } from '../activities/activity.entity';
import { AppraisalRequest } from '../appraisal-requests/appraisal-request.entity';
import { BuyerPropertyCandidate } from '../buyer-property-candidates/buyer-property-candidate.entity';
import { Property } from '../properties/property.entity';
import { SearchRequirement } from '../search-requirements/search-requirement.entity';
import { Visit } from '../visits/visit.entity';
import { ContactRole } from './contact-role.entity';

@Entity('contacts')
export class Contact {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  teamId: number;

  @Column()
  ownerUserId: number;

  @Column()
  firstName: string;

  @Column()
  lastName: string;

  @Column()
  displayName: string;

  @Column({ type: 'varchar', nullable: true })
  phone: string | null;

  @Column({ type: 'varchar', nullable: true })
  whatsapp: string | null;

  @Column({ type: 'varchar', nullable: true })
  email: string | null;

  @Column({ type: 'varchar', nullable: true })
  documentNumber: string | null;

  @Column({ type: 'varchar', nullable: true })
  source: string | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => ContactRole, (role) => role.contact, {
    cascade: true,
    eager: true,
  })
  roles: ContactRole[];

  @OneToMany(() => SearchRequirement, (requirement) => requirement.contact)
  searchRequirements: SearchRequirement[];

  @OneToMany(() => Activity, (activity) => activity.contact)
  activities: Activity[];

  @OneToMany(() => Visit, (visit) => visit.contact)
  visits: Visit[];

  @OneToMany(() => Property, (property) => property.ownerContact)
  ownedProperties: Property[];

  @OneToMany(() => BuyerPropertyCandidate, (candidate) => candidate.contact)
  propertyCandidates: BuyerPropertyCandidate[];

  @OneToMany(() => AppraisalRequest, (appraisalRequest) => appraisalRequest.contact)
  appraisalRequests: AppraisalRequest[];
}
