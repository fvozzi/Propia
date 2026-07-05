import { MigrationInterface, QueryRunner } from 'typeorm';

export class RenameAppraisalRequestsToPrelisting1710000000028
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE "activities"
      SET "title" = CASE
        WHEN "title" = 'Solicitud de tasacion' THEN 'Prelisting'
        WHEN "title" ~ '^Solicitud de tasacion (Â·|·|-)' THEN regexp_replace("title", '^Solicitud de tasacion (Â·|·|-)', 'Prelisting ·')
        ELSE "title"
      END
      WHERE "activityType" = 'APPRAISAL_REQUEST'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE "activities"
      SET "title" = CASE
        WHEN "title" = 'Prelisting' THEN 'Solicitud de tasacion'
        WHEN "title" ~ '^Prelisting ·' THEN regexp_replace("title", '^Prelisting ·', 'Solicitud de tasacion ·')
        ELSE "title"
      END
      WHERE "activityType" = 'APPRAISAL_REQUEST'
    `);
  }
}
