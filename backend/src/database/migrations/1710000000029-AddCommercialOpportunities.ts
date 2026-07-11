import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableColumn,
  TableForeignKey,
} from 'typeorm';

export class AddCommercialOpportunities1710000000029
  implements MigrationInterface
{
  name = 'AddCommercialOpportunities1710000000029';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "commercial_opportunity_stage" AS ENUM ('NEW', 'QUALIFYING', 'SEARCHING', 'PRELISTING_SENT', 'PRELISTING_COMPLETED', 'PROPERTY_READY', 'VISITING', 'NEGOTIATING', 'RESERVED', 'CLOSED_WON', 'CLOSED_LOST')`,
    );
    await queryRunner.query(
      `CREATE TYPE "commercial_opportunity_status" AS ENUM ('OPEN', 'WON', 'LOST', 'ARCHIVED')`,
    );

    await queryRunner.createTable(
      new Table({
        name: 'commercial_opportunities',
        columns: [
          {
            name: 'id',
            type: 'integer',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          { name: 'teamId', type: 'integer' },
          { name: 'ownerUserId', type: 'integer' },
          { name: 'contactId', type: 'integer' },
          { name: 'operationType', type: 'operation_type' },
          { name: 'stage', type: 'commercial_opportunity_stage' },
          { name: 'status', type: 'commercial_opportunity_status' },
          { name: 'sourceActivityId', type: 'integer', isNullable: true },
          { name: 'searchRequirementId', type: 'integer', isNullable: true },
          { name: 'appraisalRequestId', type: 'integer', isNullable: true },
          { name: 'propertyId', type: 'integer', isNullable: true },
          { name: 'title', type: 'varchar' },
          { name: 'summary', type: 'text', isNullable: true },
          { name: 'lostReason', type: 'text', isNullable: true },
          {
            name: 'closedAt',
            type: 'timestamp with time zone',
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

    await queryRunner.addColumns('activities', [
      new TableColumn({
        name: 'commercialOpportunityId',
        type: 'integer',
        isNullable: true,
      }),
    ]);

    await queryRunner.addColumns('financial_entries', [
      new TableColumn({
        name: 'commercialOpportunityId',
        type: 'integer',
        isNullable: true,
      }),
    ]);

    await queryRunner.createForeignKeys('commercial_opportunities', [
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
        onDelete: 'CASCADE',
      }),
      new TableForeignKey({
        columnNames: ['contactId'],
        referencedTableName: 'contacts',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
      new TableForeignKey({
        columnNames: ['sourceActivityId'],
        referencedTableName: 'activities',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      }),
      new TableForeignKey({
        columnNames: ['searchRequirementId'],
        referencedTableName: 'search_requirements',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      }),
      new TableForeignKey({
        columnNames: ['appraisalRequestId'],
        referencedTableName: 'appraisal_requests',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      }),
      new TableForeignKey({
        columnNames: ['propertyId'],
        referencedTableName: 'properties',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      }),
    ]);

    await queryRunner.createForeignKey(
      'activities',
      new TableForeignKey({
        columnNames: ['commercialOpportunityId'],
        referencedTableName: 'commercial_opportunities',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      }),
    );

    await queryRunner.createForeignKey(
      'financial_entries',
      new TableForeignKey({
        columnNames: ['commercialOpportunityId'],
        referencedTableName: 'commercial_opportunities',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const activitiesTable = await queryRunner.getTable('activities');
    const activitiesForeignKey = activitiesTable?.foreignKeys.find((foreignKey) =>
      foreignKey.columnNames.includes('commercialOpportunityId'),
    );
    if (activitiesForeignKey) {
      await queryRunner.dropForeignKey('activities', activitiesForeignKey);
    }

    const financialEntriesTable = await queryRunner.getTable('financial_entries');
    const financialEntriesForeignKey = financialEntriesTable?.foreignKeys.find((foreignKey) =>
      foreignKey.columnNames.includes('commercialOpportunityId'),
    );
    if (financialEntriesForeignKey) {
      await queryRunner.dropForeignKey(
        'financial_entries',
        financialEntriesForeignKey,
      );
    }

    const opportunitiesTable = await queryRunner.getTable(
      'commercial_opportunities',
    );
    if (opportunitiesTable) {
      for (const foreignKey of opportunitiesTable.foreignKeys) {
        await queryRunner.dropForeignKey(
          'commercial_opportunities',
          foreignKey,
        );
      }
    }

    await queryRunner.dropColumn('activities', 'commercialOpportunityId');
    await queryRunner.dropColumn(
      'financial_entries',
      'commercialOpportunityId',
    );
    await queryRunner.dropTable('commercial_opportunities');
    await queryRunner.query(`DROP TYPE "commercial_opportunity_status"`);
    await queryRunner.query(`DROP TYPE "commercial_opportunity_stage"`);
  }
}
