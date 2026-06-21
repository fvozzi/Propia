import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddVisitExternalUrl1710000000027 implements MigrationInterface {
  name = 'AddVisitExternalUrl1710000000027';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'visits',
      new TableColumn({
        name: 'externalUrl',
        type: 'text',
        isNullable: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('visits', 'externalUrl');
  }
}
