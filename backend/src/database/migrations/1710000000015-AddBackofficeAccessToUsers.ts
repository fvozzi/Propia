import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddBackofficeAccessToUsers1710000000015 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'users',
      new TableColumn({
        name: 'backofficeAccess',
        type: 'boolean',
        default: false,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('users', 'backofficeAccess');
  }
}
