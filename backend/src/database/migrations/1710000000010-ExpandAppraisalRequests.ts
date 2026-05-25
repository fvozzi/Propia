import { MigrationInterface, QueryRunner } from 'typeorm';

export class ExpandAppraisalRequests1710000000010 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "public"."appraisal_orientation" AS ENUM('EAST', 'NORTH', 'SOUTH', 'WEST')
    `);
    await queryRunner.query(`
      CREATE TYPE "public"."appraisal_disposition" AS ENUM('FRONT', 'BACK')
    `);
    await queryRunner.query(`
      ALTER TABLE "appraisal_requests"
      ADD "expenses" double precision,
      ADD "floor" integer,
      ADD "amenities" text,
      ADD "orientation" "public"."appraisal_orientation",
      ADD "disposition" "public"."appraisal_disposition",
      ADD "ageYears" integer,
      ADD "semiCoveredArea" double precision,
      ADD "uncoveredArea" double precision,
      ADD "weightedArea" double precision
    `);

    await queryRunner.query(`
      UPDATE "appraisal_requests"
      SET "totalArea" = COALESCE("coveredArea", 0),
          "weightedArea" = COALESCE("coveredArea", 0)
      WHERE "coveredArea" IS NOT NULL
         OR "totalArea" IS NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "appraisal_requests"
      DROP COLUMN "weightedArea",
      DROP COLUMN "uncoveredArea",
      DROP COLUMN "semiCoveredArea",
      DROP COLUMN "ageYears",
      DROP COLUMN "disposition",
      DROP COLUMN "orientation",
      DROP COLUMN "amenities",
      DROP COLUMN "floor",
      DROP COLUMN "expenses"
    `);
    await queryRunner.query(`DROP TYPE "public"."appraisal_disposition"`);
    await queryRunner.query(`DROP TYPE "public"."appraisal_orientation"`);
  }
}
