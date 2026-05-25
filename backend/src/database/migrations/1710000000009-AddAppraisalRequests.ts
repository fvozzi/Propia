import { MigrationInterface, QueryRunner, Table, TableForeignKey, TableIndex } from 'typeorm';

export class AddAppraisalRequests1710000000009 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'appraisal_requests',
        columns: [
          { name: 'id', type: 'integer', isPrimary: true, isGenerated: true, generationStrategy: 'increment' },
          { name: 'teamId', type: 'integer' },
          { name: 'ownerUserId', type: 'integer' },
          { name: 'contactId', type: 'integer' },
          { name: 'publicToken', type: 'varchar', isUnique: true },
          { name: 'expiresAt', type: 'timestamp with time zone' },
          { name: 'submittedAt', type: 'timestamp with time zone', isNullable: true },
          { name: 'propertyAddress', type: 'varchar', isNullable: true },
          { name: 'city', type: 'varchar', isNullable: true },
          { name: 'neighborhood', type: 'varchar', isNullable: true },
          { name: 'propertyType', type: 'enum', enumName: 'property_type', enum: ['HOUSE', 'APARTMENT', 'PH', 'LAND', 'OFFICE', 'COMMERCIAL', 'OTHER'], isNullable: true },
          { name: 'operationType', type: 'enum', enumName: 'operation_type', enum: ['SALE', 'BUY', 'RENT'], isNullable: true },
          { name: 'rooms', type: 'integer', isNullable: true },
          { name: 'bedrooms', type: 'integer', isNullable: true },
          { name: 'bathrooms', type: 'integer', isNullable: true },
          { name: 'coveredArea', type: 'double precision', isNullable: true },
          { name: 'totalArea', type: 'double precision', isNullable: true },
          { name: 'hasGarage', type: 'boolean', isNullable: true },
          { name: 'conditionNotes', type: 'text', isNullable: true },
          { name: 'valuationReason', type: 'text', isNullable: true },
          { name: 'availabilityNotes', type: 'text', isNullable: true },
          { name: 'additionalNotes', type: 'text', isNullable: true },
          { name: 'createdAt', type: 'timestamp with time zone', default: 'CURRENT_TIMESTAMP' },
          { name: 'updatedAt', type: 'timestamp with time zone', default: 'CURRENT_TIMESTAMP' },
        ],
      }),
    );

    await queryRunner.createForeignKeys('appraisal_requests', [
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
    ]);

    await queryRunner.createIndices('appraisal_requests', [
      new TableIndex({
        name: 'IDX_appraisal_requests_teamId',
        columnNames: ['teamId'],
      }),
      new TableIndex({
        name: 'IDX_appraisal_requests_contactId',
        columnNames: ['contactId'],
      }),
    ]);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('appraisal_requests');
  }
}
