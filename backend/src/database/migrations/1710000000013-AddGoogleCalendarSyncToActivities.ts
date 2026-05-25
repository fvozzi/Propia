import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddGoogleCalendarSyncToActivities1710000000013 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumns('activities', [
      new TableColumn({
        name: 'googleEventId',
        type: 'varchar',
        isNullable: true,
      }),
      new TableColumn({
        name: 'googleSyncStatus',
        type: 'varchar',
        default: "'PENDING'",
      }),
      new TableColumn({
        name: 'lastSyncedAt',
        type: 'timestamp with time zone',
        isNullable: true,
      }),
      new TableColumn({
        name: 'googleSyncError',
        type: 'text',
        isNullable: true,
      }),
    ]);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumns('activities', [
      'googleEventId',
      'googleSyncStatus',
      'lastSyncedAt',
      'googleSyncError',
    ]);
  }
}
