import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';

@Entity('finance_configs')
@Unique('UQ_finance_configs_team', ['teamId'])
export class FinanceConfig {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  teamId: number;

  @Column({ type: 'double precision', default: 55 })
  franchisePercent: number;

  @Column({ type: 'double precision', default: 3 })
  saleCommissionPercent: number;

  @Column({ type: 'double precision', default: 4 })
  purchaseCommissionPercent: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
