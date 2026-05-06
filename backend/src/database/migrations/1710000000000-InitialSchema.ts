import { MigrationInterface, QueryRunner, Table, TableForeignKey } from 'typeorm';

export class InitialSchema1710000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'users',
        columns: [
          {
            name: 'id',
            type: 'integer',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          { name: 'email', type: 'varchar', isUnique: true },
          { name: 'passwordHash', type: 'varchar' },
          { name: 'name', type: 'varchar' },
          {
            name: 'createdAt',
            type: 'timestamp with time zone',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
    );

    await queryRunner.createTable(
      new Table({
        name: 'contacts',
        columns: [
          { name: 'id', type: 'integer', isPrimary: true, isGenerated: true, generationStrategy: 'increment' },
          { name: 'firstName', type: 'varchar' },
          { name: 'lastName', type: 'varchar' },
          { name: 'displayName', type: 'varchar' },
          { name: 'phone', type: 'varchar', isNullable: true },
          { name: 'whatsapp', type: 'varchar', isNullable: true },
          { name: 'email', type: 'varchar', isNullable: true },
          { name: 'source', type: 'varchar', isNullable: true },
          { name: 'notes', type: 'text', isNullable: true },
          { name: 'createdAt', type: 'timestamp with time zone', default: 'CURRENT_TIMESTAMP' },
          { name: 'updatedAt', type: 'timestamp with time zone', default: 'CURRENT_TIMESTAMP' },
        ],
      }),
    );

    await queryRunner.createTable(
      new Table({
        name: 'contact_roles',
        columns: [
          { name: 'id', type: 'integer', isPrimary: true, isGenerated: true, generationStrategy: 'increment' },
          {
            name: 'role',
            type: 'enum',
            enumName: 'contact_role_type',
            enum: ['OWNER', 'BUYER', 'TENANT', 'INVESTOR', 'REFERRER', 'REALTOR', 'NOTARY', 'OTHER'],
          },
          { name: 'contactId', type: 'integer' },
        ],
      }),
    );

    await queryRunner.createTable(
      new Table({
        name: 'properties',
        columns: [
          { name: 'id', type: 'integer', isPrimary: true, isGenerated: true, generationStrategy: 'increment' },
          { name: 'title', type: 'varchar' },
          { name: 'description', type: 'text', isNullable: true },
          { name: 'address', type: 'varchar' },
          { name: 'city', type: 'varchar' },
          { name: 'neighborhood', type: 'varchar', isNullable: true },
          {
            name: 'operationType',
            type: 'enum',
            enumName: 'operation_type',
            enum: ['SALE', 'RENT'],
          },
          {
            name: 'propertyType',
            type: 'enum',
            enumName: 'property_type',
            enum: ['HOUSE', 'APARTMENT', 'PH', 'LAND', 'OFFICE', 'COMMERCIAL', 'OTHER'],
          },
          {
            name: 'status',
            type: 'enum',
            enumName: 'property_status',
            enum: ['DRAFT', 'APPRAISAL', 'CAPTURED', 'ACTIVE', 'RESERVED', 'SOLD', 'RENTED', 'ARCHIVED', 'LOST'],
          },
          { name: 'price', type: 'double precision', isNullable: true },
          {
            name: 'currency',
            type: 'enum',
            enumName: 'currency_type',
            enum: ['USD', 'ARS'],
          },
          { name: 'expenses', type: 'double precision', isNullable: true },
          { name: 'bedrooms', type: 'integer', isNullable: true },
          { name: 'bathrooms', type: 'integer', isNullable: true },
          { name: 'rooms', type: 'integer', isNullable: true },
          { name: 'coveredArea', type: 'double precision', isNullable: true },
          { name: 'totalArea', type: 'double precision', isNullable: true },
          { name: 'ownerContactId', type: 'integer', isNullable: true },
          { name: 'privateNotes', type: 'text', isNullable: true },
          { name: 'createdAt', type: 'timestamp with time zone', default: 'CURRENT_TIMESTAMP' },
          { name: 'updatedAt', type: 'timestamp with time zone', default: 'CURRENT_TIMESTAMP' },
        ],
      }),
    );

    await queryRunner.createTable(
      new Table({
        name: 'property_photos',
        columns: [
          { name: 'id', type: 'integer', isPrimary: true, isGenerated: true, generationStrategy: 'increment' },
          { name: 'propertyId', type: 'integer' },
          { name: 'url', type: 'varchar' },
          { name: 'thumbnailUrl', type: 'varchar', isNullable: true },
          { name: 'caption', type: 'varchar', isNullable: true },
          { name: 'orderIndex', type: 'integer', default: 0 },
        ],
      }),
    );

    await queryRunner.createTable(
      new Table({
        name: 'search_requirements',
        columns: [
          { name: 'id', type: 'integer', isPrimary: true, isGenerated: true, generationStrategy: 'increment' },
          { name: 'contactId', type: 'integer' },
          {
            name: 'operationType',
            type: 'enum',
            enumName: 'operation_type',
            enum: ['SALE', 'RENT'],
          },
          {
            name: 'propertyType',
            type: 'enum',
            enumName: 'property_type',
            enum: ['HOUSE', 'APARTMENT', 'PH', 'LAND', 'OFFICE', 'COMMERCIAL', 'OTHER'],
          },
          { name: 'neighborhoods', type: 'text', isArray: true, default: "'{}'" },
          { name: 'minPrice', type: 'double precision', isNullable: true },
          { name: 'maxPrice', type: 'double precision', isNullable: true },
          {
            name: 'currency',
            type: 'enum',
            enumName: 'currency_type',
            enum: ['USD', 'ARS'],
          },
          { name: 'minRooms', type: 'integer', isNullable: true },
          { name: 'minBedrooms', type: 'integer', isNullable: true },
          { name: 'notes', type: 'text', isNullable: true },
          {
            name: 'status',
            type: 'enum',
            enumName: 'search_requirement_status',
            enum: ['ACTIVE', 'PAUSED', 'CLOSED'],
          },
          { name: 'createdAt', type: 'timestamp with time zone', default: 'CURRENT_TIMESTAMP' },
          { name: 'updatedAt', type: 'timestamp with time zone', default: 'CURRENT_TIMESTAMP' },
        ],
      }),
    );

    await queryRunner.createTable(
      new Table({
        name: 'activities',
        columns: [
          { name: 'id', type: 'integer', isPrimary: true, isGenerated: true, generationStrategy: 'increment' },
          { name: 'contactId', type: 'integer', isNullable: true },
          { name: 'propertyId', type: 'integer', isNullable: true },
          {
            name: 'activityType',
            type: 'enum',
            enumName: 'activity_type',
            enum: ['CALL', 'WHATSAPP', 'EMAIL', 'INSTAGRAM', 'MEETING', 'VISIT', 'NOTE', 'FOLLOW_UP'],
          },
          { name: 'title', type: 'varchar' },
          { name: 'description', type: 'text', isNullable: true },
          { name: 'activityDate', type: 'timestamp with time zone' },
          { name: 'nextFollowUpDate', type: 'timestamp with time zone', isNullable: true },
          { name: 'createdAt', type: 'timestamp with time zone', default: 'CURRENT_TIMESTAMP' },
        ],
      }),
    );

    await queryRunner.createTable(
      new Table({
        name: 'visits',
        columns: [
          { name: 'id', type: 'integer', isPrimary: true, isGenerated: true, generationStrategy: 'increment' },
          { name: 'propertyId', type: 'integer' },
          { name: 'contactId', type: 'integer' },
          { name: 'scheduledAt', type: 'timestamp with time zone' },
          {
            name: 'status',
            type: 'enum',
            enumName: 'visit_status',
            enum: ['SCHEDULED', 'DONE', 'CANCELLED', 'RESCHEDULED'],
          },
          { name: 'notes', type: 'text', isNullable: true },
          { name: 'createdAt', type: 'timestamp with time zone', default: 'CURRENT_TIMESTAMP' },
          { name: 'updatedAt', type: 'timestamp with time zone', default: 'CURRENT_TIMESTAMP' },
        ],
      }),
    );

    await queryRunner.createForeignKeys('contact_roles', [
      new TableForeignKey({
        columnNames: ['contactId'],
        referencedTableName: 'contacts',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    ]);

    await queryRunner.createForeignKeys('properties', [
      new TableForeignKey({
        columnNames: ['ownerContactId'],
        referencedTableName: 'contacts',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      }),
    ]);

    await queryRunner.createForeignKeys('property_photos', [
      new TableForeignKey({
        columnNames: ['propertyId'],
        referencedTableName: 'properties',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    ]);

    await queryRunner.createForeignKeys('search_requirements', [
      new TableForeignKey({
        columnNames: ['contactId'],
        referencedTableName: 'contacts',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    ]);

    await queryRunner.createForeignKeys('activities', [
      new TableForeignKey({
        columnNames: ['contactId'],
        referencedTableName: 'contacts',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      }),
      new TableForeignKey({
        columnNames: ['propertyId'],
        referencedTableName: 'properties',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      }),
    ]);

    await queryRunner.createForeignKeys('visits', [
      new TableForeignKey({
        columnNames: ['propertyId'],
        referencedTableName: 'properties',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
      new TableForeignKey({
        columnNames: ['contactId'],
        referencedTableName: 'contacts',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    ]);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('visits');
    await queryRunner.dropTable('activities');
    await queryRunner.dropTable('search_requirements');
    await queryRunner.dropTable('property_photos');
    await queryRunner.dropTable('properties');
    await queryRunner.dropTable('contact_roles');
    await queryRunner.dropTable('contacts');
    await queryRunner.dropTable('users');

    await queryRunner.query('DROP TYPE IF EXISTS "visit_status"');
    await queryRunner.query('DROP TYPE IF EXISTS "activity_type"');
    await queryRunner.query('DROP TYPE IF EXISTS "search_requirement_status"');
    await queryRunner.query('DROP TYPE IF EXISTS "property_status"');
    await queryRunner.query('DROP TYPE IF EXISTS "property_type"');
    await queryRunner.query('DROP TYPE IF EXISTS "operation_type"');
    await queryRunner.query('DROP TYPE IF EXISTS "currency_type"');
    await queryRunner.query('DROP TYPE IF EXISTS "contact_role_type"');
  }
}
