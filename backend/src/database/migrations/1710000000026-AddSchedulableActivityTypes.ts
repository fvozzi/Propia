import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSchedulableActivityTypes1710000000026
  implements MigrationInterface
{
  name = 'AddSchedulableActivityTypes1710000000026';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TYPE "activity_type" ADD VALUE IF NOT EXISTS 'MARKET_ANALYSIS'`,
    );
    await queryRunner.query(
      `ALTER TYPE "activity_type" ADD VALUE IF NOT EXISTS 'PHOTO_SESSION'`,
    );
    await queryRunner.query(
      `ALTER TYPE "activity_type" ADD VALUE IF NOT EXISTS 'RESERVATION'`,
    );
  }

  public async down(): Promise<void> {
    // PostgreSQL enums do not support dropping values safely in-place.
  }
}
