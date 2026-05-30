import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddPropertySearchImageTemplate1710000000020 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'teams',
      new TableColumn({
        name: 'whatsappPropertySearchImageTemplateName',
        type: 'varchar',
        isNullable: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('teams', 'whatsappPropertySearchImageTemplateName');
  }
}
