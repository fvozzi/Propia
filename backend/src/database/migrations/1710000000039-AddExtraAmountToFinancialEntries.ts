import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddExtraAmountToFinancialEntries1710000000039
  implements MigrationInterface
{
  name = 'AddExtraAmountToFinancialEntries1710000000039';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "financial_entries" ADD COLUMN IF NOT EXISTS "extraAmount" double precision`,
    );
    await queryRunner.query(
      `UPDATE "financial_entries" SET "extraAmount" = 0 WHERE "entryType" = 'INCOME' AND "extraAmount" IS NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "financial_entries" DROP COLUMN IF EXISTS "extraAmount"`,
    );
  }
}
