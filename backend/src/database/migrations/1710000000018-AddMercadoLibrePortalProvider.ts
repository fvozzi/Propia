import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddMercadoLibrePortalProvider1710000000018
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TYPE "portal_provider_key" ADD VALUE IF NOT EXISTS 'MERCADOLIBRE'`,
    );
  }

  public async down(): Promise<void> {
    // PostgreSQL enum value removal is intentionally omitted.
  }
}
