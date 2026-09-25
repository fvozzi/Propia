import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddVisitPublicToken1710000000045 implements MigrationInterface {
  name = 'AddVisitPublicToken1710000000045';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "visits" ADD COLUMN IF NOT EXISTS "publicToken" varchar`,
    );
    await queryRunner.query(
      `UPDATE "visits"
       SET "publicToken" = substring(md5(random()::text || clock_timestamp()::text || id::text), 1, 16)
       WHERE "publicToken" IS NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "visits" ALTER COLUMN "publicToken" SET NOT NULL`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_visits_public_token" ON "visits" ("publicToken")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_visits_public_token"`);
    await queryRunner.query(
      `ALTER TABLE "visits" DROP COLUMN IF EXISTS "publicToken"`,
    );
  }
}
