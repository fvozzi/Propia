import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
  TableUnique,
} from 'typeorm';

export class AddActivityGoals1710000000021 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'activity_goals',
        columns: [
          {
            name: 'id',
            type: 'integer',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'teamId',
            type: 'integer',
          },
          {
            name: 'activityType',
            type: 'enum',
            enumName: 'activity_type',
            enum: [
              'CALL',
              'WHATSAPP',
              'EMAIL',
              'INSTAGRAM',
              'MEETING',
              'VISIT',
              'NOTE',
              'FOLLOW_UP',
              'PROPERTY_SEARCH',
              'APPRAISAL_REQUEST',
            ],
          },
          {
            name: 'targetCount',
            type: 'integer',
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

    await queryRunner.createUniqueConstraint(
      'activity_goals',
      new TableUnique({
        name: 'UQ_activity_goals_team_activity_type',
        columnNames: ['teamId', 'activityType'],
      }),
    );

    await queryRunner.createForeignKey(
      'activity_goals',
      new TableForeignKey({
        columnNames: ['teamId'],
        referencedTableName: 'teams',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('activity_goals');
    const teamForeignKey = table?.foreignKeys.find((foreignKey) =>
      foreignKey.columnNames.includes('teamId'),
    );

    if (teamForeignKey) {
      await queryRunner.dropForeignKey('activity_goals', teamForeignKey);
    }

    await queryRunner.dropUniqueConstraint(
      'activity_goals',
      'UQ_activity_goals_team_activity_type',
    );
    await queryRunner.dropTable('activity_goals');
  }
}
