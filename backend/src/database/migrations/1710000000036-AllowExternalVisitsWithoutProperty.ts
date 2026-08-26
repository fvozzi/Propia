import { MigrationInterface, QueryRunner } from 'typeorm';

export class AllowExternalVisitsWithoutProperty1710000000036
  implements MigrationInterface
{
  name = 'AllowExternalVisitsWithoutProperty1710000000036';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "visits"
      ALTER COLUMN "propertyId" DROP NOT NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "visits"
      ADD COLUMN IF NOT EXISTS "externalPropertyTitle" varchar,
      ADD COLUMN IF NOT EXISTS "externalPropertyAddress" text
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "visits"
      DROP COLUMN IF EXISTS "externalPropertyAddress",
      DROP COLUMN IF EXISTS "externalPropertyTitle"
    `);

    await queryRunner.query(`
      DELETE FROM "visits"
      WHERE "propertyId" IS NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "visits"
      ALTER COLUMN "propertyId" SET NOT NULL
    `);
  }
}
