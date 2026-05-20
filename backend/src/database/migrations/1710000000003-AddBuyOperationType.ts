import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddBuyOperationType1710000000003 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TYPE "operation_type" ADD VALUE IF NOT EXISTS 'BUY'`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`UPDATE "properties" SET "operationType" = 'SALE' WHERE "operationType" = 'BUY'`);
    await queryRunner.query(
      `UPDATE "search_requirements" SET "operationType" = 'SALE' WHERE "operationType" = 'BUY'`,
    );
    await queryRunner.query(`ALTER TYPE "operation_type" RENAME TO "operation_type_old"`);
    await queryRunner.query(`CREATE TYPE "operation_type" AS ENUM('SALE', 'RENT')`);
    await queryRunner.query(
      `ALTER TABLE "properties" ALTER COLUMN "operationType" TYPE "operation_type" USING "operationType"::text::"operation_type"`,
    );
    await queryRunner.query(
      `ALTER TABLE "search_requirements" ALTER COLUMN "operationType" TYPE "operation_type" USING "operationType"::text::"operation_type"`,
    );
    await queryRunner.query(`DROP TYPE "operation_type_old"`);
  }
}
