import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableColumn,
  TableForeignKey,
  TableIndex,
} from 'typeorm';

export class AddTeamsAndOwnership1710000000002 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'teams',
        columns: [
          {
            name: 'id',
            type: 'integer',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          { name: 'name', type: 'varchar' },
          {
            name: 'createdAt',
            type: 'timestamp with time zone',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
    );

    await queryRunner.createTable(
      new Table({
        name: 'team_memberships',
        columns: [
          {
            name: 'id',
            type: 'integer',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          { name: 'teamId', type: 'integer' },
          { name: 'userId', type: 'integer' },
          {
            name: 'role',
            type: 'enum',
            enumName: 'team_membership_role',
            enum: ['OWNER', 'MEMBER'],
            default: "'MEMBER'",
          },
          {
            name: 'createdAt',
            type: 'timestamp with time zone',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
    );

    await queryRunner.createIndex(
      'team_memberships',
      new TableIndex({
        name: 'IDX_team_memberships_team_user_unique',
        columnNames: ['teamId', 'userId'],
        isUnique: true,
      }),
    );

    await queryRunner.addColumns('users', [
      new TableColumn({
        name: 'appRole',
        type: 'enum',
        enumName: 'app_user_role',
        enum: ['ADMIN', 'USER'],
        default: "'USER'",
      }),
      new TableColumn({
        name: 'activeTeamId',
        type: 'integer',
        isNullable: true,
      }),
    ]);

    const scopedTables = ['contacts', 'properties', 'activities', 'search_requirements', 'visits'];
    for (const tableName of scopedTables) {
      await queryRunner.addColumns(tableName, [
        new TableColumn({
          name: 'teamId',
          type: 'integer',
          isNullable: true,
        }),
        new TableColumn({
          name: 'ownerUserId',
          type: 'integer',
          isNullable: true,
        }),
      ]);
    }

    await queryRunner.createForeignKeys('team_memberships', [
      new TableForeignKey({
        columnNames: ['teamId'],
        referencedTableName: 'teams',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
      new TableForeignKey({
        columnNames: ['userId'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    ]);

    await queryRunner.createForeignKey(
      'users',
      new TableForeignKey({
        columnNames: ['activeTeamId'],
        referencedTableName: 'teams',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      }),
    );

    for (const tableName of scopedTables) {
      await queryRunner.createForeignKeys(tableName, [
        new TableForeignKey({
          columnNames: ['teamId'],
          referencedTableName: 'teams',
          referencedColumnNames: ['id'],
          onDelete: 'CASCADE',
        }),
        new TableForeignKey({
          columnNames: ['ownerUserId'],
          referencedTableName: 'users',
          referencedColumnNames: ['id'],
          onDelete: 'NO ACTION',
        }),
      ]);

      await queryRunner.createIndex(
        tableName,
        new TableIndex({
          name: `IDX_${tableName}_teamId`,
          columnNames: ['teamId'],
        }),
      );
    }

    const existingUsers: Array<{ id: number; name: string; email: string }> = await queryRunner.query(
      'SELECT id, name, email FROM users ORDER BY id ASC',
    );

    let primaryUserId: number | null = null;
    let primaryTeamId: number | null = null;
    const demoUser = existingUsers.find((user) => user.email === 'agent@propia.local');

    for (const [index, user] of existingUsers.entries()) {
      const teamName = `${(user.name || user.email).trim()} Team`;
      const [team] = await queryRunner.query(
        'INSERT INTO teams ("name") VALUES ($1) RETURNING id',
        [teamName],
      );
      const teamId = Number(team.id);

      const appRole = demoUser
        ? user.id === demoUser.id
          ? 'ADMIN'
          : 'USER'
        : index === 0
          ? 'ADMIN'
          : 'USER';

      await queryRunner.query(
        'UPDATE users SET "appRole" = $1, "activeTeamId" = $2 WHERE id = $3',
        [appRole, teamId, user.id],
      );

      await queryRunner.query(
        'INSERT INTO team_memberships ("teamId", "userId", "role") VALUES ($1, $2, $3)',
        [teamId, user.id, 'OWNER'],
      );

      if (
        (demoUser && user.id === demoUser.id) ||
        (!demoUser && index === 0) ||
        primaryUserId === null
      ) {
        primaryUserId = user.id;
        primaryTeamId = teamId;
      }
    }

    if (primaryUserId === null || primaryTeamId === null) {
      throw new Error('At least one user is required to migrate ownership data.');
    }

    for (const tableName of scopedTables) {
      await queryRunner.query(
        `UPDATE "${tableName}" SET "teamId" = $1, "ownerUserId" = $2 WHERE "teamId" IS NULL OR "ownerUserId" IS NULL`,
        [primaryTeamId, primaryUserId],
      );
    }

    for (const tableName of scopedTables) {
      await queryRunner.changeColumns(tableName, [
        {
          oldColumn: new TableColumn({
            name: 'teamId',
            type: 'integer',
            isNullable: true,
          }),
          newColumn: new TableColumn({
            name: 'teamId',
            type: 'integer',
            isNullable: false,
          }),
        },
        {
          oldColumn: new TableColumn({
            name: 'ownerUserId',
            type: 'integer',
            isNullable: true,
          }),
          newColumn: new TableColumn({
            name: 'ownerUserId',
            type: 'integer',
            isNullable: false,
          }),
        },
      ]);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const scopedTables = ['contacts', 'properties', 'activities', 'search_requirements', 'visits'];

    for (const tableName of scopedTables) {
      await queryRunner.dropIndex(tableName, `IDX_${tableName}_teamId`);
      await queryRunner.dropColumns(tableName, ['teamId', 'ownerUserId']);
    }

    await queryRunner.dropColumns('users', ['appRole', 'activeTeamId']);
    await queryRunner.dropTable('team_memberships');
    await queryRunner.dropTable('teams');

    await queryRunner.query('DROP TYPE IF EXISTS "team_membership_role"');
    await queryRunner.query('DROP TYPE IF EXISTS "app_user_role"');
  }
}
