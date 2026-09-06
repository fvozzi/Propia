import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';

@Entity('bna_exchange_rates')
@Unique('UQ_bna_exchange_rates_rate_date', ['rateDate'])
export class BnaExchangeRate {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'date' })
  rateDate: string;

  @Column({ type: 'date' })
  sourceDate: string;

  @Column({ type: 'double precision' })
  buyRate: number;

  @Column({ type: 'double precision' })
  sellRate: number;

  @Column({ type: 'varchar', default: 'BNA' })
  provider: string;

  @Column({ type: 'boolean', default: false })
  carriedForward: boolean;

  @CreateDateColumn()
  fetchedAt: Date;
}
