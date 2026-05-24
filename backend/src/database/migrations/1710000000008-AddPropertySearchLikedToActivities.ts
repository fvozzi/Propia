import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddPropertySearchLikedToActivities1710000000008 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'activities',
      new TableColumn({
        name: 'propertySearchLiked',
        type: 'boolean',
        isNullable: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('activities', 'propertySearchLiked');
  }
}
