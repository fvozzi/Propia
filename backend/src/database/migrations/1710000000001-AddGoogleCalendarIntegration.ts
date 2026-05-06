import { MigrationInterface, QueryRunner, Table, TableColumn, TableForeignKey } from 'typeorm';

export class AddGoogleCalendarIntegration1710000000001 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.changeColumn(
      'users',
      'passwordHash',
      new TableColumn({
        name: 'passwordHash',
        type: 'varchar',
        isNullable: true,
      }),
    );

    await queryRunner.createTable(
      new Table({
        name: 'google_calendar_connections',
        columns: [
          { name: 'id', type: 'integer', isPrimary: true, isGenerated: true, generationStrategy: 'increment' },
          { name: 'userId', type: 'integer', isUnique: true },
          { name: 'googleSub', type: 'varchar' },
          { name: 'email', type: 'varchar' },
          { name: 'calendarId', type: 'varchar', default: "'primary'" },
          { name: 'isActive', type: 'boolean', default: true },
          { name: 'accessToken', type: 'text', isNullable: true },
          { name: 'refreshToken', type: 'text', isNullable: true },
          { name: 'scope', type: 'text', isNullable: true },
          { name: 'tokenType', type: 'varchar', isNullable: true },
          { name: 'expiryDate', type: 'bigint', isNullable: true },
          { name: 'createdAt', type: 'timestamp with time zone', default: 'CURRENT_TIMESTAMP' },
          { name: 'updatedAt', type: 'timestamp with time zone', default: 'CURRENT_TIMESTAMP' },
        ],
      }),
    );

    await queryRunner.createForeignKey(
      'google_calendar_connections',
      new TableForeignKey({
        columnNames: ['userId'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.addColumns('visits', [
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
    await queryRunner.dropColumns('visits', [
      'googleEventId',
      'googleSyncStatus',
      'lastSyncedAt',
      'googleSyncError',
    ]);

    await queryRunner.dropTable('google_calendar_connections');

    await queryRunner.changeColumn(
      'users',
      'passwordHash',
      new TableColumn({
        name: 'passwordHash',
        type: 'varchar',
        isNullable: false,
      }),
    );
  }
}
