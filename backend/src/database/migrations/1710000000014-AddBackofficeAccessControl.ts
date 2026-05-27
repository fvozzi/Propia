import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableColumn,
  TableForeignKey,
} from 'typeorm';

export class AddBackofficeAccessControl1710000000014 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumns('teams', [
      new TableColumn({
        name: 'status',
        type: 'enum',
        enum: ['ACTIVE', 'TRIAL', 'PAST_DUE', 'SUSPENDED', 'CANCELLED'],
        enumName: 'account_status',
        default: "'ACTIVE'",
      }),
      new TableColumn({
        name: 'planName',
        type: 'varchar',
        isNullable: true,
      }),
      new TableColumn({
        name: 'trialEndsAt',
        type: 'timestamp with time zone',
        isNullable: true,
      }),
      new TableColumn({
        name: 'paidUntil',
        type: 'timestamp with time zone',
        isNullable: true,
      }),
      new TableColumn({
        name: 'maxUsers',
        type: 'integer',
        isNullable: true,
      }),
      new TableColumn({
        name: 'suspendedAt',
        type: 'timestamp with time zone',
        isNullable: true,
      }),
      new TableColumn({
        name: 'suspensionReason',
        type: 'varchar',
        isNullable: true,
      }),
    ]);

    await queryRunner.addColumns('users', [
      new TableColumn({
        name: 'status',
        type: 'enum',
        enum: ['ACTIVE', 'PENDING', 'DISABLED'],
        enumName: 'user_status',
        default: "'ACTIVE'",
      }),
      new TableColumn({
        name: 'lastLoginAt',
        type: 'timestamp with time zone',
        isNullable: true,
      }),
      new TableColumn({
        name: 'loginCount',
        type: 'integer',
        default: 0,
      }),
    ]);

    await queryRunner.createTable(
      new Table({
        name: 'login_events',
        columns: [
          {
            name: 'id',
            type: 'integer',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'email',
            type: 'varchar',
          },
          {
            name: 'userId',
            type: 'integer',
            isNullable: true,
          },
          {
            name: 'teamId',
            type: 'integer',
            isNullable: true,
          },
          {
            name: 'success',
            type: 'boolean',
            default: false,
          },
          {
            name: 'authMethod',
            type: 'varchar',
          },
          {
            name: 'ipAddress',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'userAgent',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'failureReason',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'createdAt',
            type: 'timestamp with time zone',
            default: 'now()',
          },
        ],
      }),
    );

    await queryRunner.createForeignKeys('login_events', [
      new TableForeignKey({
        columnNames: ['userId'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      }),
      new TableForeignKey({
        columnNames: ['teamId'],
        referencedTableName: 'teams',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      }),
    ]);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const loginEventsTable = await queryRunner.getTable('login_events');
    if (loginEventsTable) {
      await queryRunner.dropForeignKeys('login_events', loginEventsTable.foreignKeys);
    }

    await queryRunner.dropTable('login_events');
    await queryRunner.dropColumns('users', ['status', 'lastLoginAt', 'loginCount']);
    await queryRunner.dropColumns('teams', [
      'status',
      'planName',
      'trialEndsAt',
      'paidUntil',
      'maxUsers',
      'suspendedAt',
      'suspensionReason',
    ]);
    await queryRunner.query("DROP TYPE IF EXISTS \"user_status\"");
    await queryRunner.query("DROP TYPE IF EXISTS \"account_status\"");
  }
}
