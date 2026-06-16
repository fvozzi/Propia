import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import {
  CurrencyType,
  ExpenseCategory,
  FinancialEntryType,
  OperationType,
} from '../common/enums';
import { Activity } from '../activities/activity.entity';
import { SearchRequirement } from '../search-requirements/search-requirement.entity';

@Entity('financial_entries')
export class FinancialEntry {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  teamId: number;

  @Column()
  ownerUserId: number;

  @Column({ type: 'enum', enum: FinancialEntryType, enumName: 'financial_entry_type' })
  entryType: FinancialEntryType;

  @Column({ type: 'timestamp with time zone' })
  entryDate: Date;

  @Column({ type: 'enum', enum: CurrencyType, enumName: 'currency_type' })
  currency: CurrencyType;

  @Column({ type: 'double precision' })
  amount: number;

  @Column({ type: 'enum', enum: ExpenseCategory, enumName: 'expense_category', nullable: true })
  expenseCategory: ExpenseCategory | null;

  @ManyToOne(() => Activity, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'activityId' })
  activity: Activity | null;

  @Column({ type: 'integer', nullable: true })
  activityId: number | null;

  @ManyToOne(() => SearchRequirement, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'searchRequirementId' })
  searchRequirement: SearchRequirement | null;

  @Column({ type: 'integer', nullable: true })
  searchRequirementId: number | null;

  @Column({ type: 'enum', enum: OperationType, enumName: 'operation_type', nullable: true })
  incomeOperationType: OperationType | null;

  @Column({ type: 'double precision', nullable: true })
  operationAmount: number | null;

  @Column({ type: 'double precision', nullable: true })
  commissionPercent: number | null;

  @Column({ type: 'double precision', nullable: true })
  commissionAmount: number | null;

  @Column({ type: 'double precision', nullable: true })
  franchisePercent: number | null;

  @Column({ type: 'double precision', nullable: true })
  franchiseAmount: number | null;

  @Column({ type: 'double precision', nullable: true })
  netIncomeAmount: number | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @CreateDateColumn()
  createdAt: Date;
}
