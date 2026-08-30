import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCommercialOpportunityExternalBuyerLead1710000000037
  implements MigrationInterface
{
  name = 'AddCommercialOpportunityExternalBuyerLead1710000000037';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "commercial_opportunities" ADD COLUMN IF NOT EXISTS "isExternalBuyerLead" boolean NOT NULL DEFAULT false`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "commercial_opportunities" DROP COLUMN IF EXISTS "isExternalBuyerLead"`,
    );
  }
}
