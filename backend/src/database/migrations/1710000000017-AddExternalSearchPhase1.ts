import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
} from 'typeorm';

export class AddExternalSearchPhase11710000000017 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'portal_source_configs',
        columns: [
          { name: 'id', type: 'integer', isPrimary: true, isGenerated: true, generationStrategy: 'increment' },
          { name: 'teamId', type: 'integer' },
          {
            name: 'providerKey',
            type: 'enum',
            enum: ['ARGENPROP', 'ZONAPROP', 'MOCK'],
            enumName: 'portal_provider_key',
          },
          { name: 'enabled', type: 'boolean', default: 'true' },
          { name: 'priority', type: 'int', default: '100' },
          { name: 'baseUrl', type: 'varchar', isNullable: true },
          { name: 'rateLimitPerHour', type: 'int', isNullable: true },
          { name: 'maxResultsPerRun', type: 'int', isNullable: true },
          { name: 'requiresAuth', type: 'boolean', default: 'false' },
          { name: 'authConfig', type: 'jsonb', isNullable: true },
          { name: 'createdAt', type: 'timestamp with time zone', default: 'now()' },
          { name: 'updatedAt', type: 'timestamp with time zone', default: 'now()' },
        ],
      }),
    );

    await queryRunner.createTable(
      new Table({
        name: 'external_listings',
        columns: [
          { name: 'id', type: 'integer', isPrimary: true, isGenerated: true, generationStrategy: 'increment' },
          { name: 'teamId', type: 'integer' },
          {
            name: 'providerKey',
            type: 'enum',
            enum: ['ARGENPROP', 'ZONAPROP', 'MOCK'],
            enumName: 'portal_provider_key',
          },
          { name: 'externalListingId', type: 'varchar', isNullable: true },
          { name: 'canonicalUrl', type: 'varchar' },
          { name: 'urlHash', type: 'varchar' },
          { name: 'title', type: 'varchar' },
          { name: 'description', type: 'text', isNullable: true },
          { name: 'operationType', type: 'enum', enumName: 'operation_type', enum: ['SALE', 'BUY', 'RENT'] },
          { name: 'propertyType', type: 'enum', enumName: 'property_type', enum: ['HOUSE', 'APARTMENT', 'PH', 'LAND', 'OFFICE', 'COMMERCIAL', 'OTHER'] },
          { name: 'price', type: 'double precision', isNullable: true },
          { name: 'currency', type: 'enum', enumName: 'currency_type', enum: ['USD', 'ARS'] },
          { name: 'expenses', type: 'double precision', isNullable: true },
          { name: 'address', type: 'varchar', isNullable: true },
          { name: 'city', type: 'varchar', isNullable: true },
          { name: 'neighborhood', type: 'varchar', isNullable: true },
          { name: 'rooms', type: 'int', isNullable: true },
          { name: 'bedrooms', type: 'int', isNullable: true },
          { name: 'bathrooms', type: 'int', isNullable: true },
          { name: 'hasGarage', type: 'boolean', isNullable: true },
          { name: 'coveredArea', type: 'double precision', isNullable: true },
          { name: 'totalArea', type: 'double precision', isNullable: true },
          { name: 'sourcePublishedAt', type: 'timestamp with time zone', isNullable: true },
          { name: 'firstSeenAt', type: 'timestamp with time zone' },
          { name: 'lastSeenAt', type: 'timestamp with time zone' },
          { name: 'rawPayload', type: 'jsonb', isNullable: true },
          {
            name: 'status',
            type: 'enum',
            enum: ['ACTIVE', 'MISSING', 'DUPLICATED', 'ARCHIVED'],
            enumName: 'external_listing_status',
            default: "'ACTIVE'",
          },
          { name: 'createdAt', type: 'timestamp with time zone', default: 'now()' },
          { name: 'updatedAt', type: 'timestamp with time zone', default: 'now()' },
        ],
      }),
    );

    await queryRunner.createTable(
      new Table({
        name: 'requirement_portal_matches',
        columns: [
          { name: 'id', type: 'integer', isPrimary: true, isGenerated: true, generationStrategy: 'increment' },
          { name: 'teamId', type: 'integer' },
          { name: 'searchRequirementId', type: 'integer' },
          { name: 'externalListingId', type: 'integer' },
          { name: 'score', type: 'int' },
          { name: 'scoreBreakdown', type: 'jsonb' },
          { name: 'matchReasons', type: 'text', isArray: true, default: "'{}'" },
          { name: 'dismissed', type: 'boolean', default: 'false' },
          { name: 'dismissedReason', type: 'text', isNullable: true },
          { name: 'dismissedAt', type: 'timestamp with time zone', isNullable: true },
          { name: 'buyerPropertyCandidateId', type: 'integer', isNullable: true },
          { name: 'convertedToCandidateAt', type: 'timestamp with time zone', isNullable: true },
          { name: 'activityId', type: 'integer', isNullable: true },
          { name: 'createdActivityAt', type: 'timestamp with time zone', isNullable: true },
          { name: 'lastEvaluatedAt', type: 'timestamp with time zone' },
          { name: 'createdAt', type: 'timestamp with time zone', default: 'now()' },
          { name: 'updatedAt', type: 'timestamp with time zone', default: 'now()' },
        ],
      }),
    );

    await queryRunner.createTable(
      new Table({
        name: 'portal_search_runs',
        columns: [
          { name: 'id', type: 'integer', isPrimary: true, isGenerated: true, generationStrategy: 'increment' },
          { name: 'teamId', type: 'integer' },
          {
            name: 'providerKey',
            type: 'enum',
            enum: ['ARGENPROP', 'ZONAPROP', 'MOCK'],
            enumName: 'portal_provider_key',
          },
          { name: 'searchRequirementId', type: 'integer' },
          {
            name: 'status',
            type: 'enum',
            enum: ['PENDING', 'RUNNING', 'SUCCESS', 'FAILED'],
            enumName: 'portal_search_run_status',
          },
          { name: 'startedAt', type: 'timestamp with time zone' },
          { name: 'finishedAt', type: 'timestamp with time zone', isNullable: true },
          { name: 'fetchedCount', type: 'int', default: '0' },
          { name: 'normalizedCount', type: 'int', default: '0' },
          { name: 'matchedCount', type: 'int', default: '0' },
          { name: 'errorMessage', type: 'text', isNullable: true },
          { name: 'requestSnapshot', type: 'jsonb', isNullable: true },
          { name: 'createdAt', type: 'timestamp with time zone', default: 'now()' },
          { name: 'updatedAt', type: 'timestamp with time zone', default: 'now()' },
        ],
      }),
    );

    await queryRunner.createForeignKeys('portal_source_configs', [
      new TableForeignKey({
        columnNames: ['teamId'],
        referencedTableName: 'teams',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    ]);

    await queryRunner.createForeignKeys('external_listings', [
      new TableForeignKey({
        columnNames: ['teamId'],
        referencedTableName: 'teams',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    ]);

    await queryRunner.createForeignKeys('requirement_portal_matches', [
      new TableForeignKey({
        columnNames: ['teamId'],
        referencedTableName: 'teams',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
      new TableForeignKey({
        columnNames: ['searchRequirementId'],
        referencedTableName: 'search_requirements',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
      new TableForeignKey({
        columnNames: ['externalListingId'],
        referencedTableName: 'external_listings',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
      new TableForeignKey({
        columnNames: ['buyerPropertyCandidateId'],
        referencedTableName: 'buyer_property_candidates',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      }),
      new TableForeignKey({
        columnNames: ['activityId'],
        referencedTableName: 'activities',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      }),
    ]);

    await queryRunner.createForeignKeys('portal_search_runs', [
      new TableForeignKey({
        columnNames: ['teamId'],
        referencedTableName: 'teams',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
      new TableForeignKey({
        columnNames: ['searchRequirementId'],
        referencedTableName: 'search_requirements',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    ]);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    for (const tableName of [
      'portal_search_runs',
      'requirement_portal_matches',
      'external_listings',
      'portal_source_configs',
    ]) {
      const table = await queryRunner.getTable(tableName);
      if (table) {
        await queryRunner.dropForeignKeys(tableName, table.foreignKeys);
      }
    }

    await queryRunner.dropTable('portal_search_runs');
    await queryRunner.dropTable('requirement_portal_matches');
    await queryRunner.dropTable('external_listings');
    await queryRunner.dropTable('portal_source_configs');
    await queryRunner.query('DROP TYPE IF EXISTS "portal_search_run_status"');
    await queryRunner.query('DROP TYPE IF EXISTS "external_listing_status"');
    await queryRunner.query('DROP TYPE IF EXISTS "portal_provider_key"');
  }
}
