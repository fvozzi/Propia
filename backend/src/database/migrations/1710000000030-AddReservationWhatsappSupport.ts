import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddReservationWhatsappSupport1710000000030
  implements MigrationInterface
{
  name = 'AddReservationWhatsappSupport1710000000030';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "activities" ADD COLUMN IF NOT EXISTS "reservationData" jsonb`,
    );
    await queryRunner.query(
      `ALTER TABLE "teams" ADD COLUMN IF NOT EXISTS "whatsappTreasuryPhone" varchar`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "teams" DROP COLUMN IF EXISTS "whatsappTreasuryPhone"`,
    );
    await queryRunner.query(
      `ALTER TABLE "activities" DROP COLUMN IF EXISTS "reservationData"`,
    );
  }
}
