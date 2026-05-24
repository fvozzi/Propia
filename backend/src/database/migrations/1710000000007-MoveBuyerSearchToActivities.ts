import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class MoveBuyerSearchToActivities1710000000007 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TYPE "activity_type" ADD VALUE IF NOT EXISTS 'PROPERTY_SEARCH'`);

    await queryRunner.addColumns('activities', [
      new TableColumn({
        name: 'externalUrl',
        type: 'varchar',
        isNullable: true,
      }),
      new TableColumn({
        name: 'whatsappComment',
        type: 'text',
        isNullable: true,
      }),
      new TableColumn({
        name: 'whatsappSharedAt',
        type: 'timestamp with time zone',
        isNullable: true,
      }),
    ]);

    await queryRunner.query(`
      INSERT INTO "activities" (
        "teamId",
        "ownerUserId",
        "contactId",
        "propertyId",
        "activityType",
        "title",
        "description",
        "externalUrl",
        "whatsappComment",
        "whatsappSharedAt",
        "activityDate",
        "nextFollowUpDate",
        "createdAt"
      )
      SELECT
        "teamId",
        "ownerUserId",
        "contactId",
        NULL,
        'PROPERTY_SEARCH',
        "title",
        "internalNotes",
        "url",
        "shareComments",
        "sharedAt",
        "createdAt",
        NULL,
        "createdAt"
      FROM "buyer_property_candidates"
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM "activities" activity
      USING "buyer_property_candidates" candidate
      WHERE activity."activityType" = 'PROPERTY_SEARCH'
        AND activity."teamId" = candidate."teamId"
        AND activity."ownerUserId" = candidate."ownerUserId"
        AND activity."contactId" = candidate."contactId"
        AND activity."title" = candidate."title"
        AND activity."externalUrl" = candidate."url"
        AND activity."activityDate" = candidate."createdAt"
    `);
    await queryRunner.query(`
      UPDATE "activities"
      SET "activityType" = 'NOTE'
      WHERE "activityType" = 'PROPERTY_SEARCH'
    `);
    await queryRunner.dropColumns('activities', ['externalUrl', 'whatsappComment', 'whatsappSharedAt']);
    await queryRunner.query(`ALTER TYPE "activity_type" RENAME TO "activity_type_old"`);
    await queryRunner.query(`
      CREATE TYPE "activity_type" AS ENUM(
        'CALL',
        'WHATSAPP',
        'EMAIL',
        'INSTAGRAM',
        'MEETING',
        'VISIT',
        'NOTE',
        'FOLLOW_UP'
      )
    `);
    await queryRunner.query(`
      ALTER TABLE "activities"
      ALTER COLUMN "activityType" TYPE "activity_type"
      USING "activityType"::text::"activity_type"
    `);
    await queryRunner.query(`DROP TYPE "activity_type_old"`);
  }
}
