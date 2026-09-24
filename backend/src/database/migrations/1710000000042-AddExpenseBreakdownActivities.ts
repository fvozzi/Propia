import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddExpenseBreakdownActivities1710000000042
  implements MigrationInterface
{
  name = 'AddExpenseBreakdownActivities1710000000042';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TYPE "activity_type" ADD VALUE IF NOT EXISTS 'EXPENSE_BREAKDOWN'`,
    );
    await queryRunner.query(
      `ALTER TABLE "activities" ADD COLUMN IF NOT EXISTS "expenseBreakdownData" jsonb`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "activities" DROP COLUMN IF EXISTS "expenseBreakdownData"`,
    );
    // PostgreSQL enums do not support dropping values safely in-place.
  }
}
