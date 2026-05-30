import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddActivityExternalPreview1710000000019 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumns('activities', [
      new TableColumn({
        name: 'externalPreviewImageUrl',
        type: 'varchar',
        isNullable: true,
      }),
      new TableColumn({
        name: 'externalPreviewTitle',
        type: 'varchar',
        isNullable: true,
      }),
      new TableColumn({
        name: 'externalPreviewDescription',
        type: 'text',
        isNullable: true,
      }),
      new TableColumn({
        name: 'externalPreviewDomain',
        type: 'varchar',
        isNullable: true,
      }),
      new TableColumn({
        name: 'externalPreviewFetchedAt',
        type: 'timestamp with time zone',
        isNullable: true,
      }),
    ]);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumns('activities', [
      'externalPreviewImageUrl',
      'externalPreviewTitle',
      'externalPreviewDescription',
      'externalPreviewDomain',
      'externalPreviewFetchedAt',
    ]);
  }
}
