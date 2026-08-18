import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddBuyerPropertyCandidateWorkflow1710000000034
  implements MigrationInterface
{
  name = 'AddBuyerPropertyCandidateWorkflow1710000000034';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      BEGIN
        CREATE TYPE "buyer_property_candidate_workflow_status" AS ENUM (
          'TO_CONTACT',
          'CONTACTED',
          'WAITING_RESPONSE',
          'PROPOSED_SCHEDULES',
          'VISIT_SCHEDULED',
          'VISITED',
          'DISCARDED',
          'INTERESTED'
        );
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      ALTER TABLE "buyer_property_candidates"
      ADD COLUMN IF NOT EXISTS "propertyId" integer,
      ADD COLUMN IF NOT EXISTS "workflowStatus" "buyer_property_candidate_workflow_status" NOT NULL DEFAULT 'TO_CONTACT',
      ADD COLUMN IF NOT EXISTS "agentName" varchar,
      ADD COLUMN IF NOT EXISTS "agentWhatsapp" varchar,
      ADD COLUMN IF NOT EXISTS "proposedScheduleOptions" text,
      ADD COLUMN IF NOT EXISTS "scheduledVisitAt" TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS "workflowNotes" text,
      ADD COLUMN IF NOT EXISTS "lastContactedAt" TIMESTAMPTZ
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname = 'FK_buyer_property_candidates_property'
        ) THEN
          ALTER TABLE "buyer_property_candidates"
          ADD CONSTRAINT "FK_buyer_property_candidates_property"
          FOREIGN KEY ("propertyId") REFERENCES "properties"("id")
          ON DELETE SET NULL ON UPDATE NO ACTION;
        END IF;
      END $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "buyer_property_candidates"
      DROP CONSTRAINT IF EXISTS "FK_buyer_property_candidates_property"
    `);

    await queryRunner.query(`
      ALTER TABLE "buyer_property_candidates"
      DROP COLUMN IF EXISTS "lastContactedAt",
      DROP COLUMN IF EXISTS "workflowNotes",
      DROP COLUMN IF EXISTS "scheduledVisitAt",
      DROP COLUMN IF EXISTS "proposedScheduleOptions",
      DROP COLUMN IF EXISTS "agentWhatsapp",
      DROP COLUMN IF EXISTS "agentName",
      DROP COLUMN IF EXISTS "workflowStatus",
      DROP COLUMN IF EXISTS "propertyId"
    `);

    await queryRunner.query(`
      DROP TYPE IF EXISTS "buyer_property_candidate_workflow_status"
    `);
  }
}
