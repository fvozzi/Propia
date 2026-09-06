import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddC21MonthlyFeeExpenseCategory1710000000041
  implements MigrationInterface
{
  name = 'AddC21MonthlyFeeExpenseCategory1710000000041';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TYPE "expense_category" ADD VALUE IF NOT EXISTS 'C21_MONTHLY_FEE'`,
    );
  }

  public async down(): Promise<void> {
    // PostgreSQL enums do not support dropping values safely in-place.
  }
}
