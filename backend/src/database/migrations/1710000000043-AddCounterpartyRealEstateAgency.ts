import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCounterpartyRealEstateAgency1710000000043
  implements MigrationInterface
{
  name = 'AddCounterpartyRealEstateAgency1710000000043';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "commercial_opportunities" ADD COLUMN IF NOT EXISTS "counterpartyRealEstateAgency" varchar`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "commercial_opportunities" DROP COLUMN IF EXISTS "counterpartyRealEstateAgency"`,
    );
  }
}
