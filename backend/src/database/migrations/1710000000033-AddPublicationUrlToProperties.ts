import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddPublicationUrlToProperties1710000000033
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'properties',
      new TableColumn({
        name: 'publicationUrl',
        type: 'varchar',
        isNullable: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('properties', 'publicationUrl');
  }
}
