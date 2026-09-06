import { MigrationInterface, QueryRunner, Table, TableUnique } from 'typeorm';

export class AddBnaExchangeRates1710000000040 implements MigrationInterface {
  name = 'AddBnaExchangeRates1710000000040';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'bna_exchange_rates',
        columns: [
          {
            name: 'id',
            type: 'integer',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          { name: 'rateDate', type: 'date' },
          { name: 'sourceDate', type: 'date' },
          { name: 'buyRate', type: 'double precision' },
          { name: 'sellRate', type: 'double precision' },
          { name: 'provider', type: 'varchar', default: "'BNA'" },
          { name: 'carriedForward', type: 'boolean', default: false },
          {
            name: 'fetchedAt',
            type: 'timestamp with time zone',
            default: 'now()',
          },
        ],
        uniques: [
          new TableUnique({
            name: 'UQ_bna_exchange_rates_rate_date',
            columnNames: ['rateDate'],
          }),
        ],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('bna_exchange_rates');
  }
}
