import { MigrationInterface, QueryRunner } from 'typeorm';

export class LinkPropertiesToAppraisals1710000000012 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "properties" ADD "semiCoveredArea" double precision
    `);
    await queryRunner.query(`
      ALTER TABLE "properties" ADD "uncoveredArea" double precision
    `);
    await queryRunner.query(`
      ALTER TABLE "properties" ADD "weightedArea" double precision
    `);
    await queryRunner.query(`
      ALTER TABLE "properties" ADD "floor" integer
    `);
    await queryRunner.query(`
      ALTER TABLE "properties" ADD "amenities" text
    `);
    await queryRunner.query(`
      ALTER TABLE "properties" ADD "orientation" "public"."appraisal_orientation"
    `);
    await queryRunner.query(`
      ALTER TABLE "properties" ADD "disposition" "public"."appraisal_disposition"
    `);
    await queryRunner.query(`
      ALTER TABLE "properties" ADD "ageYears" integer
    `);
    await queryRunner.query(`
      ALTER TABLE "properties" ADD "hasGarage" boolean
    `);
    await queryRunner.query(`
      ALTER TABLE "properties" ADD "appraisalRequestId" integer
    `);
    await queryRunner.query(`
      ALTER TABLE "properties"
      ADD CONSTRAINT "UQ_properties_appraisalRequestId" UNIQUE ("appraisalRequestId")
    `);
    await queryRunner.query(`
      ALTER TABLE "properties"
      ADD CONSTRAINT "FK_properties_appraisalRequestId"
      FOREIGN KEY ("appraisalRequestId") REFERENCES "appraisal_requests"("id") ON DELETE SET NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "properties" DROP CONSTRAINT "FK_properties_appraisalRequestId"
    `);
    await queryRunner.query(`
      ALTER TABLE "properties" DROP CONSTRAINT "UQ_properties_appraisalRequestId"
    `);
    await queryRunner.query(`
      ALTER TABLE "properties" DROP COLUMN "appraisalRequestId"
    `);
    await queryRunner.query(`
      ALTER TABLE "properties" DROP COLUMN "hasGarage"
    `);
    await queryRunner.query(`
      ALTER TABLE "properties" DROP COLUMN "ageYears"
    `);
    await queryRunner.query(`
      ALTER TABLE "properties" DROP COLUMN "disposition"
    `);
    await queryRunner.query(`
      ALTER TABLE "properties" DROP COLUMN "orientation"
    `);
    await queryRunner.query(`
      ALTER TABLE "properties" DROP COLUMN "amenities"
    `);
    await queryRunner.query(`
      ALTER TABLE "properties" DROP COLUMN "floor"
    `);
    await queryRunner.query(`
      ALTER TABLE "properties" DROP COLUMN "weightedArea"
    `);
    await queryRunner.query(`
      ALTER TABLE "properties" DROP COLUMN "uncoveredArea"
    `);
    await queryRunner.query(`
      ALTER TABLE "properties" DROP COLUMN "semiCoveredArea"
    `);
  }
}
