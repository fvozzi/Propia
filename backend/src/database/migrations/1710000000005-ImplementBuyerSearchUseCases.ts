import { MigrationInterface, QueryRunner, Table, TableColumn, TableForeignKey, TableIndex } from 'typeorm';

export class ImplementBuyerSearchUseCases1710000000005 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumns('search_requirements', [
      new TableColumn({
        name: 'minBathrooms',
        type: 'integer',
        isNullable: true,
      }),
      new TableColumn({
        name: 'needsParking',
        type: 'boolean',
        default: false,
      }),
      new TableColumn({
        name: 'creditEligible',
        type: 'boolean',
        default: false,
      }),
      new TableColumn({
        name: 'bright',
        type: 'boolean',
        default: false,
      }),
      new TableColumn({
        name: 'amenities',
        type: 'text',
        isArray: true,
        default: "'{}'",
      }),
    ]);

    await queryRunner.createTable(
      new Table({
        name: 'buyer_property_candidates',
        columns: [
          {
            name: 'id',
            type: 'integer',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          { name: 'teamId', type: 'integer' },
          { name: 'ownerUserId', type: 'integer' },
          { name: 'contactId', type: 'integer' },
          { name: 'searchRequirementId', type: 'integer', isNullable: true },
          { name: 'portal', type: 'varchar' },
          { name: 'url', type: 'varchar' },
          { name: 'title', type: 'varchar' },
          { name: 'internalNotes', type: 'text', isNullable: true },
          { name: 'shareComments', type: 'text', isNullable: true },
          {
            name: 'shareStatus',
            type: 'enum',
            enumName: 'buyer_property_share_status',
            enum: ['PENDING_WHATSAPP', 'SHARED_WHATSAPP'],
          },
          { name: 'sharedAt', type: 'timestamp with time zone', isNullable: true },
          { name: 'createdAt', type: 'timestamp with time zone', default: 'CURRENT_TIMESTAMP' },
          { name: 'updatedAt', type: 'timestamp with time zone', default: 'CURRENT_TIMESTAMP' },
        ],
      }),
    );

    await queryRunner.createForeignKeys('buyer_property_candidates', [
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
        onDelete: 'NO ACTION',
      }),
      new TableForeignKey({
        columnNames: ['contactId'],
        referencedTableName: 'contacts',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
      new TableForeignKey({
        columnNames: ['searchRequirementId'],
        referencedTableName: 'search_requirements',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      }),
    ]);

    await queryRunner.createIndex(
      'buyer_property_candidates',
      new TableIndex({
        name: 'IDX_buyer_property_candidates_teamId',
        columnNames: ['teamId'],
      }),
    );

    await queryRunner.createIndex(
      'buyer_property_candidates',
      new TableIndex({
        name: 'IDX_buyer_property_candidates_contactId',
        columnNames: ['contactId'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex('buyer_property_candidates', 'IDX_buyer_property_candidates_contactId');
    await queryRunner.dropIndex('buyer_property_candidates', 'IDX_buyer_property_candidates_teamId');
    await queryRunner.dropTable('buyer_property_candidates');
    await queryRunner.dropColumns('search_requirements', [
      'minBathrooms',
      'needsParking',
      'creditEligible',
      'bright',
      'amenities',
    ]);
    await queryRunner.query('DROP TYPE IF EXISTS "buyer_property_share_status"');
  }
}
