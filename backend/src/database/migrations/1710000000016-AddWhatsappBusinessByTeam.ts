import { MigrationInterface, QueryRunner, Table, TableColumn, TableForeignKey } from 'typeorm';

export class AddWhatsappBusinessByTeam1710000000016 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumns('teams', [
      new TableColumn({
        name: 'whatsappEnabled',
        type: 'boolean',
        default: false,
      }),
      new TableColumn({
        name: 'whatsappPhoneNumberId',
        type: 'varchar',
        isNullable: true,
      }),
      new TableColumn({
        name: 'whatsappBusinessAccountId',
        type: 'varchar',
        isNullable: true,
      }),
      new TableColumn({
        name: 'whatsappBusinessNumber',
        type: 'varchar',
        isNullable: true,
      }),
      new TableColumn({
        name: 'whatsappDisplayName',
        type: 'varchar',
        isNullable: true,
      }),
      new TableColumn({
        name: 'whatsappAccessToken',
        type: 'text',
        isNullable: true,
      }),
      new TableColumn({
        name: 'whatsappTemplateLanguageCode',
        type: 'varchar',
        isNullable: true,
      }),
      new TableColumn({
        name: 'whatsappPropertySearchTemplateName',
        type: 'varchar',
        isNullable: true,
      }),
      new TableColumn({
        name: 'whatsappAppraisalTemplateName',
        type: 'varchar',
        isNullable: true,
      }),
      new TableColumn({
        name: 'whatsappQualityRating',
        type: 'varchar',
        isNullable: true,
      }),
      new TableColumn({
        name: 'whatsappConnectedAt',
        type: 'timestamp with time zone',
        isNullable: true,
      }),
    ]);

    await queryRunner.createTable(
      new Table({
        name: 'whatsapp_messages',
        columns: [
          {
            name: 'id',
            type: 'integer',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'teamId',
            type: 'integer',
          },
          {
            name: 'contactId',
            type: 'integer',
            isNullable: true,
          },
          {
            name: 'activityId',
            type: 'integer',
            isNullable: true,
          },
          {
            name: 'direction',
            type: 'enum',
            enum: ['OUTBOUND', 'INBOUND'],
            enumName: 'whatsapp_message_direction',
          },
          {
            name: 'messageType',
            type: 'varchar',
          },
          {
            name: 'templateName',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'templateLanguage',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'toPhone',
            type: 'varchar',
          },
          {
            name: 'waMessageId',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'status',
            type: 'enum',
            enum: ['PENDING', 'SENT', 'DELIVERED', 'READ', 'FAILED'],
            enumName: 'whatsapp_message_status',
            default: "'PENDING'",
          },
          {
            name: 'payload',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'statusPayload',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'errorMessage',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'sentAt',
            type: 'timestamp with time zone',
            isNullable: true,
          },
          {
            name: 'deliveredAt',
            type: 'timestamp with time zone',
            isNullable: true,
          },
          {
            name: 'readAt',
            type: 'timestamp with time zone',
            isNullable: true,
          },
          {
            name: 'failedAt',
            type: 'timestamp with time zone',
            isNullable: true,
          },
          {
            name: 'createdAt',
            type: 'timestamp with time zone',
            default: 'now()',
          },
          {
            name: 'updatedAt',
            type: 'timestamp with time zone',
            default: 'now()',
          },
        ],
      }),
    );

    await queryRunner.createForeignKeys('whatsapp_messages', [
      new TableForeignKey({
        columnNames: ['teamId'],
        referencedTableName: 'teams',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
      new TableForeignKey({
        columnNames: ['contactId'],
        referencedTableName: 'contacts',
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
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const whatsappMessagesTable = await queryRunner.getTable('whatsapp_messages');
    if (whatsappMessagesTable) {
      await queryRunner.dropForeignKeys('whatsapp_messages', whatsappMessagesTable.foreignKeys);
    }

    await queryRunner.dropTable('whatsapp_messages');
    await queryRunner.dropColumns('teams', [
      'whatsappEnabled',
      'whatsappPhoneNumberId',
      'whatsappBusinessAccountId',
      'whatsappBusinessNumber',
      'whatsappDisplayName',
      'whatsappAccessToken',
      'whatsappTemplateLanguageCode',
      'whatsappPropertySearchTemplateName',
      'whatsappAppraisalTemplateName',
      'whatsappQualityRating',
      'whatsappConnectedAt',
    ]);
    await queryRunner.query('DROP TYPE IF EXISTS "whatsapp_message_direction"');
    await queryRunner.query('DROP TYPE IF EXISTS "whatsapp_message_status"');
  }
}
