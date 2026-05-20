import { MigrationInterface, QueryRunner, TableColumn, TableForeignKey } from 'typeorm';

export class AddPropertyToSearchRequirements1710000000004 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'search_requirements',
      new TableColumn({
        name: 'propertyId',
        type: 'integer',
        isNullable: true,
      }),
    );

    await queryRunner.createForeignKey(
      'search_requirements',
      new TableForeignKey({
        columnNames: ['propertyId'],
        referencedTableName: 'properties',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('search_requirements');
    const propertyForeignKey = table?.foreignKeys.find((foreignKey) => foreignKey.columnNames.includes('propertyId'));

    if (propertyForeignKey) {
      await queryRunner.dropForeignKey('search_requirements', propertyForeignKey);
    }

    await queryRunner.dropColumn('search_requirements', 'propertyId');
  }
}
