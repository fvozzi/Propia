import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddRelationshipFieldsToContacts1710000000031
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "contacts" ADD COLUMN IF NOT EXISTS "birthday" varchar`,
    );
    await queryRunner.query(
      `ALTER TABLE "contacts" ADD COLUMN IF NOT EXISTS "googleTags" text[] NOT NULL DEFAULT '{}'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "contacts" DROP COLUMN IF EXISTS "googleTags"`,
    );
    await queryRunner.query(
      `ALTER TABLE "contacts" DROP COLUMN IF EXISTS "birthday"`,
    );
  }
}
