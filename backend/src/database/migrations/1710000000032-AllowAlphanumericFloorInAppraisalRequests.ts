import { MigrationInterface, QueryRunner } from 'typeorm';

export class AllowAlphanumericFloorInAppraisalRequests1710000000032
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "appraisal_requests"
      ALTER COLUMN "floor" TYPE varchar
      USING CASE
        WHEN "floor" IS NULL THEN NULL
        ELSE "floor"::varchar
      END
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "appraisal_requests"
      ALTER COLUMN "floor" TYPE integer
      USING CASE
        WHEN "floor" ~ '^[0-9]+$' THEN "floor"::integer
        ELSE NULL
      END
    `);
  }
}
