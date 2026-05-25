import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAppraisalRequestActivities1710000000011 implements MigrationInterface {
  public transaction = false;

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TYPE "activity_type" ADD VALUE IF NOT EXISTS 'APPRAISAL_REQUEST'
    `);
    await queryRunner.query(`
      ALTER TABLE "activities" ADD "appraisalRequestId" integer
    `);
    await queryRunner.query(`
      ALTER TABLE "activities"
      ADD CONSTRAINT "FK_activities_appraisalRequestId"
      FOREIGN KEY ("appraisalRequestId") REFERENCES "appraisal_requests"("id") ON DELETE SET NULL
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_activities_appraisalRequestId" ON "activities" ("appraisalRequestId")
    `);

    await queryRunner.query(`
      INSERT INTO "activities" (
        "teamId",
        "ownerUserId",
        "contactId",
        "propertyId",
        "appraisalRequestId",
        "activityType",
        "title",
        "description",
        "externalUrl",
        "whatsappComment",
        "whatsappSharedAt",
        "propertySearchLiked",
        "activityDate",
        "nextFollowUpDate",
        "createdAt"
      )
      SELECT
        ar."teamId",
        ar."ownerUserId",
        ar."contactId",
        NULL,
        ar."id",
        'APPRAISAL_REQUEST',
        CASE
          WHEN COALESCE(TRIM(ar."propertyAddress"), '') <> '' THEN 'Solicitud de tasacion · ' || TRIM(ar."propertyAddress")
          ELSE 'Solicitud de tasacion'
        END,
        CASE
          WHEN ar."submittedAt" IS NOT NULL THEN CONCAT_WS(
            E'\\n',
            CASE WHEN COALESCE(TRIM(ar."propertyAddress"), '') <> '' THEN 'Direccion: ' || TRIM(ar."propertyAddress") END,
            CASE WHEN COALESCE(TRIM(ar."city"), '') <> '' THEN 'Ciudad: ' || TRIM(ar."city") END,
            CASE WHEN COALESCE(TRIM(ar."neighborhood"), '') <> '' THEN 'Barrio: ' || TRIM(ar."neighborhood") END
          )
          ELSE NULL
        END,
        NULL,
        NULL,
        NULL,
        NULL,
        COALESCE(ar."submittedAt", ar."createdAt"),
        NULL,
        ar."createdAt"
      FROM "appraisal_requests" ar
      WHERE NOT EXISTS (
        SELECT 1 FROM "activities" activity WHERE activity."appraisalRequestId" = ar."id"
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM "activities" WHERE "activityType" = 'APPRAISAL_REQUEST'
    `);
    await queryRunner.query(`
      DROP INDEX "public"."IDX_activities_appraisalRequestId"
    `);
    await queryRunner.query(`
      ALTER TABLE "activities" DROP CONSTRAINT "FK_activities_appraisalRequestId"
    `);
    await queryRunner.query(`
      ALTER TABLE "activities" DROP COLUMN "appraisalRequestId"
    `);
  }
}
