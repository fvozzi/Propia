import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDocumentNumberToContacts1710000000024
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "contacts" ADD COLUMN IF NOT EXISTS "documentNumber" varchar`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "contacts" DROP COLUMN IF EXISTS "documentNumber"`,
    );
  }
}
