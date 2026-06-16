import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
} from 'typeorm';

export class AddDocumentTemplates1710000000022
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "document_template_preset_key" AS ENUM ('CUSTOM', 'EXCLUSIVE_SALE_AUTHORIZATION')`,
    );

    await queryRunner.createTable(
      new Table({
        name: 'document_templates',
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
            name: 'ownerUserId',
            type: 'integer',
          },
          {
            name: 'name',
            type: 'varchar',
          },
          {
            name: 'description',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'presetKey',
            type: 'document_template_preset_key',
            default: `'CUSTOM'`,
          },
          {
            name: 'sourceFileName',
            type: 'varchar',
          },
          {
            name: 'sourceFilePath',
            type: 'varchar',
          },
          {
            name: 'fieldDefinitions',
            type: 'jsonb',
            default: `'[]'::jsonb`,
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

    await queryRunner.createForeignKeys('document_templates', [
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
    ]);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('document_templates');
    if (table) {
      for (const foreignKey of table.foreignKeys) {
        await queryRunner.dropForeignKey('document_templates', foreignKey);
      }
    }

    await queryRunner.dropTable('document_templates');
    await queryRunner.query(`DROP TYPE "document_template_preset_key"`);
  }
}
