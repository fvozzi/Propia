import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
  TableUnique,
} from 'typeorm';

export class AddFinances1710000000025 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TYPE "activity_type" ADD VALUE IF NOT EXISTS 'SALE_DEED'`,
    );
    await queryRunner.query(
      `ALTER TYPE "activity_type" ADD VALUE IF NOT EXISTS 'PURCHASE_DEED'`,
    );
    await queryRunner.query(
      `CREATE TYPE "financial_entry_type" AS ENUM ('EXPENSE', 'INCOME')`,
    );
    await queryRunner.query(
      `CREATE TYPE "expense_category" AS ENUM ('PHOTOGRAPHY', 'TRANSPORT', 'ADVERTISING', 'PROPERTY_SEARCH_SERVICES', 'PHOTOCOPIES', 'OTHER')`,
    );

    await queryRunner.createTable(
      new Table({
        name: 'finance_configs',
        columns: [
          {
            name: 'id',
            type: 'integer',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          { name: 'teamId', type: 'integer' },
          {
            name: 'franchisePercent',
            type: 'double precision',
            default: 55,
          },
          {
            name: 'saleCommissionPercent',
            type: 'double precision',
            default: 3,
          },
          {
            name: 'purchaseCommissionPercent',
            type: 'double precision',
            default: 4,
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
        uniques: [
          new TableUnique({
            name: 'UQ_finance_configs_team',
            columnNames: ['teamId'],
          }),
        ],
      }),
    );

    await queryRunner.createTable(
      new Table({
        name: 'financial_entries',
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
          { name: 'entryType', type: 'financial_entry_type' },
          { name: 'entryDate', type: 'timestamp with time zone' },
          { name: 'currency', type: 'currency_type' },
          { name: 'amount', type: 'double precision' },
          { name: 'expenseCategory', type: 'expense_category', isNullable: true },
          { name: 'activityId', type: 'integer', isNullable: true },
          { name: 'searchRequirementId', type: 'integer', isNullable: true },
          { name: 'incomeOperationType', type: 'operation_type', isNullable: true },
          { name: 'operationAmount', type: 'double precision', isNullable: true },
          { name: 'commissionPercent', type: 'double precision', isNullable: true },
          { name: 'commissionAmount', type: 'double precision', isNullable: true },
          { name: 'franchisePercent', type: 'double precision', isNullable: true },
          { name: 'franchiseAmount', type: 'double precision', isNullable: true },
          { name: 'netIncomeAmount', type: 'double precision', isNullable: true },
          { name: 'notes', type: 'text', isNullable: true },
          {
            name: 'createdAt',
            type: 'timestamp with time zone',
            default: 'now()',
          },
        ],
      }),
    );

    await queryRunner.createForeignKeys('finance_configs', [
      new TableForeignKey({
        columnNames: ['teamId'],
        referencedTableName: 'teams',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    ]);

    await queryRunner.createForeignKeys('financial_entries', [
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
        columnNames: ['activityId'],
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
    ]);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const financialEntriesTable = await queryRunner.getTable('financial_entries');
    if (financialEntriesTable) {
      for (const foreignKey of financialEntriesTable.foreignKeys) {
        await queryRunner.dropForeignKey('financial_entries', foreignKey);
      }
    }

    const financeConfigsTable = await queryRunner.getTable('finance_configs');
    if (financeConfigsTable) {
      for (const foreignKey of financeConfigsTable.foreignKeys) {
        await queryRunner.dropForeignKey('finance_configs', foreignKey);
      }
    }

    await queryRunner.dropTable('financial_entries');
    await queryRunner.dropTable('finance_configs');
    await queryRunner.query(`DROP TYPE "expense_category"`);
    await queryRunner.query(`DROP TYPE "financial_entry_type"`);
  }
}
