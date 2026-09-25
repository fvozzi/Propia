import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddVisitSearchAndColleague1710000000044
  implements MigrationInterface
{
  name = 'AddVisitSearchAndColleague1710000000044';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "visits"
        ADD COLUMN IF NOT EXISTS "colleagueContactId" integer,
        ADD COLUMN IF NOT EXISTS "colleagueName" varchar,
        ADD COLUMN IF NOT EXISTS "colleagueWhatsapp" varchar,
        ADD COLUMN IF NOT EXISTS "searchRequirementId" integer,
        ADD COLUMN IF NOT EXISTS "buyerPropertyCandidateId" integer`,
    );
    await queryRunner.query(
      `DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_visits_colleague_contact') THEN
          ALTER TABLE "visits" ADD CONSTRAINT "FK_visits_colleague_contact"
          FOREIGN KEY ("colleagueContactId") REFERENCES "contacts"("id") ON DELETE SET NULL;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_visits_search_requirement') THEN
          ALTER TABLE "visits" ADD CONSTRAINT "FK_visits_search_requirement"
          FOREIGN KEY ("searchRequirementId") REFERENCES "search_requirements"("id") ON DELETE SET NULL;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_visits_buyer_property_candidate') THEN
          ALTER TABLE "visits" ADD CONSTRAINT "FK_visits_buyer_property_candidate"
          FOREIGN KEY ("buyerPropertyCandidateId") REFERENCES "buyer_property_candidates"("id") ON DELETE SET NULL;
        END IF;
      END $$`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "visits"
        DROP CONSTRAINT IF EXISTS "FK_visits_buyer_property_candidate",
        DROP CONSTRAINT IF EXISTS "FK_visits_search_requirement",
        DROP CONSTRAINT IF EXISTS "FK_visits_colleague_contact",
        DROP COLUMN IF EXISTS "buyerPropertyCandidateId",
        DROP COLUMN IF EXISTS "searchRequirementId",
        DROP COLUMN IF EXISTS "colleagueWhatsapp",
        DROP COLUMN IF EXISTS "colleagueName",
        DROP COLUMN IF EXISTS "colleagueContactId"`,
    );
  }
}
