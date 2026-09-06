import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAgentParticipationToFinancialEntries1710000000038
  implements MigrationInterface
{
  name = 'AddAgentParticipationToFinancialEntries1710000000038';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "financial_entries" ADD COLUMN IF NOT EXISTS "agentParticipationPercent" double precision`,
    );
    await queryRunner.query(
      `ALTER TABLE "financial_entries" ADD COLUMN IF NOT EXISTS "agentGrossAmount" double precision`,
    );
    await queryRunner.query(
      `UPDATE "financial_entries" SET "agentParticipationPercent" = COALESCE("agentParticipationPercent", 100), "agentGrossAmount" = COALESCE("agentGrossAmount", "commissionAmount") WHERE "entryType" = 'INCOME' AND ("agentParticipationPercent" IS NULL OR "agentGrossAmount" IS NULL)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "financial_entries" DROP COLUMN IF EXISTS "agentGrossAmount"`,
    );
    await queryRunner.query(
      `ALTER TABLE "financial_entries" DROP COLUMN IF EXISTS "agentParticipationPercent"`,
    );
  }
}
