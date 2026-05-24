import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddPropertySearchLikedToActivities1710000000008 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumns('activities', [
      new TableColumn({
        name: 'propertySearchLiked',
        type: 'boolean',
        isNullable: true,
      }),
      new TableColumn({
        name: 'updatedAt',
        type: 'timestamp with time zone',
        default: 'CURRENT_TIMESTAMP',
      }),
    ]);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumns('activities', ['propertySearchLiked', 'updatedAt']);
  }
}
