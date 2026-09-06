import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Activity } from '../activities/activity.entity';
import {
  requireActiveTeamId,
  type AuthenticatedUser,
} from '../auth/current-user.decorator';
import { CommercialOpportunity } from '../commercial-opportunities/commercial-opportunity.entity';
import {
  ActivityType,
  FinancialEntryType,
  OperationType,
} from '../common/enums';
import { SearchRequirement } from '../search-requirements/search-requirement.entity';
import { FinanceConfig } from './finance-config.entity';
import { FinancialEntry } from './financial-entry.entity';
import { CreateFinancialEntryDto } from './dto/create-financial-entry.dto';
import { UpdateFinanceConfigDto } from './dto/update-finance-config.dto';
import { UpdateFinancialEntryDto } from './dto/update-financial-entry.dto';

@Injectable()
export class FinancesService {
  constructor(
    @InjectRepository(FinanceConfig)
    private readonly financeConfigRepository: Repository<FinanceConfig>,
    @InjectRepository(FinancialEntry)
    private readonly financialEntryRepository: Repository<FinancialEntry>,
    @InjectRepository(Activity)
    private readonly activitiesRepository: Repository<Activity>,
    @InjectRepository(SearchRequirement)
    private readonly searchRequirementsRepository: Repository<SearchRequirement>,
    @InjectRepository(CommercialOpportunity)
    private readonly opportunitiesRepository: Repository<CommercialOpportunity>,
  ) {}

  async getConfig(user: AuthenticatedUser) {
    const teamId = requireActiveTeamId(user);
    return this.ensureConfig(teamId);
  }

  async updateConfig(dto: UpdateFinanceConfigDto, user: AuthenticatedUser) {
    const teamId = requireActiveTeamId(user);
    const config = await this.ensureConfig(teamId);
    config.franchisePercent = dto.franchisePercent;
    config.saleCommissionPercent = dto.saleCommissionPercent;
    config.purchaseCommissionPercent = dto.purchaseCommissionPercent;
    return this.financeConfigRepository.save(config);
  }

  async findAllEntries(user: AuthenticatedUser) {
    const teamId = requireActiveTeamId(user);
    return this.financialEntryRepository.find({
      where: { teamId },
      relations: {
        activity: true,
        commercialOpportunity: {
          contact: true,
          property: true,
          searchRequirement: true,
        },
        searchRequirement: {
          contact: true,
          property: true,
        },
      },
      order: { entryDate: 'DESC', createdAt: 'DESC' },
    });
  }

  async createEntry(dto: CreateFinancialEntryDto, user: AuthenticatedUser) {
    const teamId = requireActiveTeamId(user);
    const entryData = await this.buildEntryData(dto, user);
    const entry = this.financialEntryRepository.create({
      teamId,
      ownerUserId: user.sub,
      ...entryData,
    });

    return this.financialEntryRepository.save(entry);
  }

  async updateEntry(
    id: number,
    dto: UpdateFinancialEntryDto,
    user: AuthenticatedUser,
  ) {
    const teamId = requireActiveTeamId(user);
    const entry = await this.financialEntryRepository.findOne({
      where: { id, teamId },
    });

    if (!entry) {
      throw new NotFoundException('Movimiento no encontrado');
    }

    const entryData = await this.buildEntryData(dto, user);
    Object.assign(entry, entryData);
    return this.financialEntryRepository.save(entry);
  }

  private async buildEntryData(
    dto: CreateFinancialEntryDto,
    user: AuthenticatedUser,
  ) {
    const teamId = requireActiveTeamId(user);
    const [config, activity, searchRequirement, selectedOpportunity] = await Promise.all([
      this.ensureConfig(teamId),
      dto.activityId
        ? this.activitiesRepository.findOne({
            where: { id: dto.activityId, teamId },
          })
        : Promise.resolve(null),
      dto.searchRequirementId
        ? this.searchRequirementsRepository.findOne({
            where: { id: dto.searchRequirementId, teamId },
          })
        : Promise.resolve(null),
      dto.commercialOpportunityId
        ? this.opportunitiesRepository.findOne({
            where: { id: dto.commercialOpportunityId, teamId },
          })
        : Promise.resolve(null),
    ]);

    if (dto.activityId && !activity) {
      throw new NotFoundException('Actividad no encontrada');
    }

    if (dto.searchRequirementId && !searchRequirement) {
      throw new NotFoundException('Requerimiento no encontrado');
    }

    if (dto.commercialOpportunityId && !selectedOpportunity) {
      throw new NotFoundException('Oportunidad comercial no encontrada');
    }

    if (
      selectedOpportunity &&
      activity?.commercialOpportunityId &&
      activity.commercialOpportunityId !== selectedOpportunity.id
    ) {
      throw new BadRequestException(
        'La actividad vinculada pertenece a otra oportunidad comercial',
      );
    }

    if (
      selectedOpportunity &&
      searchRequirement?.id &&
      selectedOpportunity.searchRequirementId &&
      selectedOpportunity.searchRequirementId !== searchRequirement.id
    ) {
      throw new BadRequestException(
        'El requerimiento vinculado no coincide con la oportunidad comercial',
      );
    }

    let resolvedOpportunity = selectedOpportunity;

    if (!resolvedOpportunity && activity?.commercialOpportunityId) {
      resolvedOpportunity = await this.opportunitiesRepository.findOne({
        where: { id: activity.commercialOpportunityId, teamId },
      });
    }

    if (!resolvedOpportunity && searchRequirement) {
      resolvedOpportunity = await this.opportunitiesRepository.findOne({
        where: { teamId, searchRequirementId: searchRequirement.id },
      });
    }

    const resolvedSearchRequirementId =
      searchRequirement?.id ?? resolvedOpportunity?.searchRequirementId ?? null;

    if (dto.entryType === FinancialEntryType.EXPENSE) {
      if (!dto.expenseCategory) {
        throw new BadRequestException('Debes indicar el tipo de egreso');
      }
      if (!dto.amount || dto.amount <= 0) {
        throw new BadRequestException('Debes indicar un monto valido');
      }

      return {
        entryType: FinancialEntryType.EXPENSE,
        entryDate: new Date(dto.entryDate),
        currency: dto.currency,
        amount: dto.amount,
        expenseCategory: dto.expenseCategory,
        activityId: activity?.id ?? null,
        searchRequirementId: resolvedSearchRequirementId,
        commercialOpportunityId: resolvedOpportunity?.id ?? null,
        incomeOperationType: null,
        operationAmount: null,
        commissionPercent: null,
        commissionAmount: null,
        agentParticipationPercent: null,
        agentGrossAmount: null,
        extraAmount: null,
        franchisePercent: null,
        franchiseAmount: null,
        netIncomeAmount: null,
        notes: dto.notes?.trim() || null,
      };
    }

    if (!activity) {
      throw new BadRequestException(
        'Los ingresos deben vincularse a una actividad de escritura',
      );
    }

    const incomeOperationType = resolveIncomeOperationType(activity.activityType);
    if (!incomeOperationType) {
      throw new BadRequestException(
        'La actividad vinculada debe ser Escritura de venta o Escritura de compra',
      );
    }

    if (!dto.operationAmount || dto.operationAmount <= 0) {
      throw new BadRequestException(
        'Debes indicar el monto total de la operacion',
      );
    }

    const commissionPercent =
      dto.commissionPercent ??
      (incomeOperationType === OperationType.SALE
        ? config.saleCommissionPercent
        : config.purchaseCommissionPercent);
    const franchisePercent = dto.franchisePercent ?? config.franchisePercent;
    const commissionAmount = roundMoney(
      dto.operationAmount * (commissionPercent / 100),
    );
    const agentParticipationPercent = dto.agentParticipationPercent ?? 100;
    const agentGrossAmount = roundMoney(
      commissionAmount * (agentParticipationPercent / 100),
    );
    const franchiseAmount = roundMoney(
      agentGrossAmount * (franchisePercent / 100),
    );
    const extraAmount = roundMoney(dto.extraAmount ?? 0);
    const netIncomeAmount = roundMoney(
      agentGrossAmount - franchiseAmount + extraAmount,
    );

    return {
      entryType: FinancialEntryType.INCOME,
      entryDate: new Date(dto.entryDate),
      currency: dto.currency,
      amount: netIncomeAmount,
      expenseCategory: null,
      activityId: activity.id,
      searchRequirementId: resolvedSearchRequirementId,
      commercialOpportunityId: resolvedOpportunity?.id ?? null,
      incomeOperationType,
      operationAmount: dto.operationAmount,
      commissionPercent,
      commissionAmount,
      agentParticipationPercent,
      agentGrossAmount,
      extraAmount,
      franchisePercent,
      franchiseAmount,
      netIncomeAmount,
      notes: dto.notes?.trim() || null,
    };
  }

  async removeEntry(id: number, user: AuthenticatedUser) {
    const teamId = requireActiveTeamId(user);
    const entry = await this.financialEntryRepository.findOne({
      where: { id, teamId },
    });

    if (!entry) {
      throw new NotFoundException('Movimiento no encontrado');
    }

    await this.financialEntryRepository.remove(entry);
    return { success: true };
  }

  private async ensureConfig(teamId: number) {
    const existing = await this.financeConfigRepository.findOne({
      where: { teamId },
    });

    if (existing) {
      return existing;
    }

    const created = this.financeConfigRepository.create({
      teamId,
      franchisePercent: 55,
      saleCommissionPercent: 3,
      purchaseCommissionPercent: 4,
    });
    return this.financeConfigRepository.save(created);
  }
}

function resolveIncomeOperationType(activityType: ActivityType) {
  switch (activityType) {
    case ActivityType.SALE_DEED:
      return OperationType.SALE;
    case ActivityType.PURCHASE_DEED:
      return OperationType.BUY;
    default:
      return null;
  }
}

function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}
