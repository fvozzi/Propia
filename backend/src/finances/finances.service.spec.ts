import { BadRequestException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  ActivityType,
  CurrencyType,
  ExpenseCategory,
  FinancialEntryType,
  FinancialIncomeType,
  OperationType,
} from '../common/enums';

vi.mock('../activities/activity.entity', () => ({
  Activity: class Activity {},
}));

vi.mock('../commercial-opportunities/commercial-opportunity.entity', () => ({
  CommercialOpportunity: class CommercialOpportunity {},
}));

vi.mock('../search-requirements/search-requirement.entity', () => ({
  SearchRequirement: class SearchRequirement {},
}));

vi.mock('./finance-config.entity', () => ({
  FinanceConfig: class FinanceConfig {},
}));

vi.mock('./financial-entry.entity', () => ({
  FinancialEntry: class FinancialEntry {},
}));

describe('FinancesService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  async function createService() {
    const { FinancesService } = await import('./finances.service');
    const financeConfigRepository = {
      findOne: vi.fn(),
      create: vi.fn((payload) => payload),
      save: vi.fn(async (value) => value),
    };
    const financialEntryRepository = {
      find: vi.fn(),
      findOne: vi.fn(),
      create: vi.fn((payload) => payload),
      save: vi.fn(async (value) => ({ id: 99, ...value })),
      remove: vi.fn(async (value) => value),
    };
    const activitiesRepository = {
      findOne: vi.fn(),
    };
    const searchRequirementsRepository = {
      findOne: vi.fn(),
    };
    const opportunitiesRepository = {
      findOne: vi.fn(),
    };

    const service = new FinancesService(
      financeConfigRepository as never,
      financialEntryRepository as never,
      activitiesRepository as never,
      searchRequirementsRepository as never,
      opportunitiesRepository as never,
    );

    return {
      service,
      financeConfigRepository,
      financialEntryRepository,
      activitiesRepository,
      searchRequirementsRepository,
      opportunitiesRepository,
    };
  }

  const user = {
    sub: 7,
    email: 'facu@test.com',
    appRole: 'ADMIN' as const,
    activeTeamId: 12,
  };

  it('creates a default finance config for the active team when none exists', async () => {
    const { service, financeConfigRepository } = await createService();
    financeConfigRepository.findOne.mockResolvedValue(null);
    financeConfigRepository.save.mockImplementation(async (value) => ({ id: 1, ...value }));

    const config = await service.getConfig(user);

    expect(financeConfigRepository.create).toHaveBeenCalledWith({
      teamId: 12,
      franchisePercent: 55,
      saleCommissionPercent: 3,
      purchaseCommissionPercent: 4,
    });
    expect(config).toMatchObject({
      id: 1,
      teamId: 12,
      franchisePercent: 55,
      saleCommissionPercent: 3,
      purchaseCommissionPercent: 4,
    });
  });

  it('updates the finance percentages for the current team', async () => {
    const { service, financeConfigRepository } = await createService();
    financeConfigRepository.findOne.mockResolvedValue({
      id: 3,
      teamId: 12,
      franchisePercent: 55,
      saleCommissionPercent: 3,
      purchaseCommissionPercent: 4,
    });

    const updated = await service.updateConfig(
      {
        franchisePercent: 50,
        saleCommissionPercent: 2.5,
        purchaseCommissionPercent: 3.5,
      },
      user,
    );

    expect(financeConfigRepository.save).toHaveBeenCalledWith({
      id: 3,
      teamId: 12,
      franchisePercent: 50,
      saleCommissionPercent: 2.5,
      purchaseCommissionPercent: 3.5,
    });
    expect(updated).toMatchObject({
      franchisePercent: 50,
      saleCommissionPercent: 2.5,
      purchaseCommissionPercent: 3.5,
    });
  });

  it('creates an expense linked to the commercial opportunity inferred from the requirement', async () => {
    const {
      service,
      financeConfigRepository,
      financialEntryRepository,
      searchRequirementsRepository,
      opportunitiesRepository,
    } = await createService();

    financeConfigRepository.findOne.mockResolvedValue({
      id: 1,
      teamId: 12,
      franchisePercent: 55,
      saleCommissionPercent: 3,
      purchaseCommissionPercent: 4,
    });
    searchRequirementsRepository.findOne.mockResolvedValue({
      id: 8,
      teamId: 12,
    });
    opportunitiesRepository.findOne.mockResolvedValue({
      id: 14,
      teamId: 12,
      searchRequirementId: 8,
    });

    const created = await service.createEntry(
      {
        entryType: FinancialEntryType.EXPENSE,
        entryDate: '2026-07-11',
        currency: CurrencyType.ARS,
        amount: 15000,
        expenseCategory: ExpenseCategory.ADVERTISING,
        searchRequirementId: 8,
        notes: '  pauta semanal  ',
      },
      user,
    );

    expect(opportunitiesRepository.findOne).toHaveBeenCalledWith({
      where: { teamId: 12, searchRequirementId: 8 },
    });
    expect(financialEntryRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        entryType: FinancialEntryType.EXPENSE,
        amount: 15000,
        expenseCategory: ExpenseCategory.ADVERTISING,
        searchRequirementId: 8,
        commercialOpportunityId: 14,
        notes: 'pauta semanal',
      }),
    );
    expect(created).toMatchObject({
      id: 99,
      commercialOpportunityId: 14,
      searchRequirementId: 8,
    });
  });

  it('creates an income from a deed activity and computes commission, franchise and net income', async () => {
    const {
      service,
      financeConfigRepository,
      financialEntryRepository,
      activitiesRepository,
      opportunitiesRepository,
    } = await createService();

    financeConfigRepository.findOne.mockResolvedValue({
      id: 1,
      teamId: 12,
      franchisePercent: 55,
      saleCommissionPercent: 3,
      purchaseCommissionPercent: 4,
    });
    activitiesRepository.findOne.mockResolvedValue({
      id: 4,
      teamId: 12,
      activityType: ActivityType.SALE_DEED,
      commercialOpportunityId: 22,
    });
    opportunitiesRepository.findOne.mockResolvedValue({
      id: 22,
      teamId: 12,
      searchRequirementId: null,
    });

    const created = await service.createEntry(
      {
        entryType: FinancialEntryType.INCOME,
        entryDate: '2026-07-11',
        currency: CurrencyType.USD,
        activityId: 4,
        operationAmount: 92000,
        notes: '  cierre caballito  ',
      },
      user,
    );

    expect(financialEntryRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        entryType: FinancialEntryType.INCOME,
        activityId: 4,
        commercialOpportunityId: 22,
        incomeOperationType: OperationType.SALE,
        operationAmount: 92000,
        commissionPercent: 3,
        commissionAmount: 2760,
        agentParticipationPercent: 100,
        agentGrossAmount: 2760,
        franchisePercent: 55,
        franchiseAmount: 1518,
        netIncomeAmount: 1242,
        amount: 1242,
        notes: 'cierre caballito',
      }),
    );
    expect(created).toMatchObject({
      id: 99,
      incomeOperationType: OperationType.SALE,
      amount: 1242,
      netIncomeAmount: 1242,
    });
  });

  it('creates a direct extra income without requiring a deed activity', async () => {
    const { service, financeConfigRepository, financialEntryRepository } =
      await createService();

    financeConfigRepository.findOne.mockResolvedValue({
      id: 1,
      teamId: 12,
      franchisePercent: 55,
      saleCommissionPercent: 3,
      purchaseCommissionPercent: 4,
    });

    const created = await service.createEntry(
      {
        entryType: FinancialEntryType.INCOME,
        incomeType: FinancialIncomeType.EXTRA,
        entryDate: '2026-09-06',
        currency: CurrencyType.USD,
        amount: 250,
        notes: '  Trabajo adicional en la negociacion  ',
      },
      user,
    );

    expect(financialEntryRepository.create).toHaveBeenCalledWith({
      teamId: 12,
      ownerUserId: 7,
      entryType: FinancialEntryType.INCOME,
      entryDate: new Date('2026-09-06'),
      currency: CurrencyType.USD,
      amount: 250,
      expenseCategory: null,
      activityId: null,
      searchRequirementId: null,
      commercialOpportunityId: null,
      incomeOperationType: null,
      operationAmount: null,
      commissionPercent: null,
      commissionAmount: null,
      agentParticipationPercent: null,
      agentGrossAmount: null,
      franchisePercent: null,
      franchiseAmount: null,
      netIncomeAmount: 250,
      notes: 'Trabajo adicional en la negociacion',
    });
    expect(created).toMatchObject({
      id: 99,
      amount: 250,
      netIncomeAmount: 250,
    });
  });

  it('requires a reason for an extra income', async () => {
    const { service, financeConfigRepository } = await createService();

    financeConfigRepository.findOne.mockResolvedValue({
      id: 1,
      teamId: 12,
      franchisePercent: 55,
      saleCommissionPercent: 3,
      purchaseCommissionPercent: 4,
    });

    await expect(
      service.createEntry(
        {
          entryType: FinancialEntryType.INCOME,
          incomeType: FinancialIncomeType.EXTRA,
          entryDate: '2026-09-06',
          currency: CurrencyType.ARS,
          amount: 50000,
          notes: '   ',
        },
        user,
      ),
    ).rejects.toThrow(
      new BadRequestException('Debes indicar el motivo del ingreso extra'),
    );
  });

  it('applies the franchise percentage after the agent participation percentage', async () => {
    const {
      service,
      financeConfigRepository,
      financialEntryRepository,
      activitiesRepository,
    } = await createService();

    financeConfigRepository.findOne.mockResolvedValue({
      id: 1,
      teamId: 12,
      franchisePercent: 55,
      saleCommissionPercent: 3,
      purchaseCommissionPercent: 4,
    });
    activitiesRepository.findOne.mockResolvedValue({
      id: 4,
      teamId: 12,
      activityType: ActivityType.SALE_DEED,
      commercialOpportunityId: null,
    });

    const created = await service.createEntry(
      {
        entryType: FinancialEntryType.INCOME,
        entryDate: '2026-09-06',
        currency: CurrencyType.USD,
        activityId: 4,
        operationAmount: 275000,
        commissionPercent: 3,
        agentParticipationPercent: 15,
        franchisePercent: 55,
      },
      user,
    );

    expect(financialEntryRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        commissionAmount: 8250,
        agentParticipationPercent: 15,
        agentGrossAmount: 1237.5,
        franchiseAmount: 680.63,
        netIncomeAmount: 556.87,
        amount: 556.87,
      }),
    );
    expect(created).toMatchObject({
      amount: 556.87,
      netIncomeAmount: 556.87,
    });
  });

  it('rejects entries when the selected activity belongs to another commercial opportunity', async () => {
    const {
      service,
      financeConfigRepository,
      activitiesRepository,
      opportunitiesRepository,
    } = await createService();

    financeConfigRepository.findOne.mockResolvedValue({
      id: 1,
      teamId: 12,
      franchisePercent: 55,
      saleCommissionPercent: 3,
      purchaseCommissionPercent: 4,
    });
    activitiesRepository.findOne.mockResolvedValue({
      id: 4,
      teamId: 12,
      activityType: ActivityType.SALE_DEED,
      commercialOpportunityId: 22,
    });
    opportunitiesRepository.findOne.mockResolvedValue({
      id: 99,
      teamId: 12,
      searchRequirementId: null,
    });

    await expect(
      service.createEntry(
        {
          entryType: FinancialEntryType.INCOME,
          entryDate: '2026-07-11',
          currency: CurrencyType.USD,
          activityId: 4,
          commercialOpportunityId: 99,
          operationAmount: 1000,
        },
        user,
      ),
    ).rejects.toThrow(
      new BadRequestException(
        'La actividad vinculada pertenece a otra oportunidad comercial',
      ),
    );
  });
});
