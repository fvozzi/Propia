import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddRequirementFeatureGroups1710000000006 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumns('search_requirements', [
      new TableColumn({
        name: 'professionalUse',
        type: 'boolean',
        default: false,
      }),
      new TableColumn({
        name: 'accessible',
        type: 'boolean',
        default: false,
      }),
      new TableColumn({
        name: 'roomTypes',
        type: 'text',
        isArray: true,
        default: "'{}'",
      }),
      new TableColumn({
        name: 'ageRange',
        type: 'varchar',
        isNullable: true,
      }),
    ]);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumns('search_requirements', [
      'professionalUse',
      'accessible',
      'roomTypes',
      'ageRange',
    ]);
  }
}
