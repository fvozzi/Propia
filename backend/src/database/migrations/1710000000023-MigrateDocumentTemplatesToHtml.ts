import { MigrationInterface, QueryRunner } from 'typeorm';

export class MigrateDocumentTemplatesToHtml1710000000023
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "document_templates" ADD COLUMN IF NOT EXISTS "htmlContent" text`,
    );
    await queryRunner.query(
      `ALTER TABLE "document_templates" ALTER COLUMN "sourceFileName" DROP NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "document_templates" ALTER COLUMN "sourceFilePath" DROP NOT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "document_templates" ALTER COLUMN "sourceFilePath" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "document_templates" ALTER COLUMN "sourceFileName" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "document_templates" DROP COLUMN IF EXISTS "htmlContent"`,
    );
  }
}
