import { MigrationInterface, QueryRunner, Table, TableColumn, TableForeignKey } from 'typeorm';

export class AddSystemBackupsAndSupportImpersonation1710000000035
  implements MigrationInterface
{
  name = 'AddSystemBackupsAndSupportImpersonation1710000000035';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'login_events',
      new TableColumn({
        name: 'actorUserId',
        type: 'integer',
        isNullable: true,
      }),
    );

    await queryRunner.createForeignKey(
      'login_events',
      new TableForeignKey({
        columnNames: ['actorUserId'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      }),
    );

    await queryRunner.createTable(
      new Table({
        name: 'system_backup_configs',
        columns: [
          {
            name: 'id',
            type: 'integer',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'backupsEnabled',
            type: 'boolean',
            default: true,
          },
          {
            name: 'storageProvider',
            type: 'varchar',
            default: "'LOCAL'",
          },
          {
            name: 'retentionCount',
            type: 'integer',
            default: 30,
          },
          {
            name: 'scheduleHourUtc',
            type: 'integer',
            default: 3,
          },
          {
            name: 'scheduleMinuteUtc',
            type: 'integer',
            default: 0,
          },
          {
            name: 'lastBackupStartedAt',
            type: 'timestamp with time zone',
            isNullable: true,
          },
          {
            name: 'lastBackupFinishedAt',
            type: 'timestamp with time zone',
            isNullable: true,
          },
          {
            name: 'lastBackupStatus',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'lastBackupError',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'createdAt',
            type: 'timestamp with time zone',
            default: 'now()',
          },
          {
            name: 'updatedAt',
            type: 'timestamp with time zone',
            default: 'now()',
          },
        ],
      }),
    );

    await queryRunner.createTable(
      new Table({
        name: 'database_backups',
        columns: [
          {
            name: 'id',
            type: 'integer',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'triggerType',
            type: 'varchar',
          },
          {
            name: 'status',
            type: 'varchar',
          },
          {
            name: 'storageProvider',
            type: 'varchar',
            default: "'LOCAL'",
          },
          {
            name: 'createdByUserId',
            type: 'integer',
            isNullable: true,
          },
          {
            name: 'fileName',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'filePath',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'fileSizeBytes',
            type: 'bigint',
            isNullable: true,
          },
          {
            name: 'errorMessage',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'finishedAt',
            type: 'timestamp with time zone',
            isNullable: true,
          },
          {
            name: 'startedAt',
            type: 'timestamp with time zone',
            default: 'now()',
          },
        ],
      }),
    );

    await queryRunner.createForeignKey(
      'database_backups',
      new TableForeignKey({
        columnNames: ['createdByUserId'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      }),
    );

    await queryRunner.query(`
      INSERT INTO "system_backup_configs" ("backupsEnabled", "storageProvider", "retentionCount", "scheduleHourUtc", "scheduleMinuteUtc")
      VALUES (true, 'LOCAL', 30, 3, 0)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const databaseBackupsTable = await queryRunner.getTable('database_backups');
    if (databaseBackupsTable) {
      await queryRunner.dropForeignKeys('database_backups', databaseBackupsTable.foreignKeys);
    }

    await queryRunner.dropTable('database_backups');
    await queryRunner.dropTable('system_backup_configs');

    const loginEventsTable = await queryRunner.getTable('login_events');
    if (loginEventsTable) {
      const actorForeignKey = loginEventsTable.foreignKeys.find((foreignKey) =>
        foreignKey.columnNames.includes('actorUserId'),
      );
      if (actorForeignKey) {
        await queryRunner.dropForeignKey('login_events', actorForeignKey);
      }
    }

    await queryRunner.dropColumn('login_events', 'actorUserId');
  }
}
