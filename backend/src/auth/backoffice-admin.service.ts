import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MoreThanOrEqual, Repository } from 'typeorm';
import { AccountStatus, UserStatus } from '../common/enums';
import { PortalSourceConfig } from '../external-search/portal-source-config.entity';
import { CreatePortalSourceConfigDto } from '../external-search/dto/create-portal-source-config.dto';
import { UpdatePortalSourceConfigDto } from '../external-search/dto/update-portal-source-config.dto';
import { LoginEvent } from './login-event.entity';
import { Team } from './team.entity';
import { User } from './user.entity';
import { UpdateAdminAccountDto } from './dto/update-admin-account.dto';

@Injectable()
export class BackofficeAdminService {
  constructor(
    @InjectRepository(Team)
    private readonly teamsRepository: Repository<Team>,
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    @InjectRepository(LoginEvent)
    private readonly loginEventsRepository: Repository<LoginEvent>,
    @InjectRepository(PortalSourceConfig)
    private readonly portalSourceConfigsRepository: Repository<PortalSourceConfig>,
  ) {}

  async getOverview() {
    const [accounts, users, successfulLogins7d, successfulLogins30d] = await Promise.all([
      this.teamsRepository.find(),
      this.usersRepository.find(),
      this.loginEventsRepository.count({
        where: {
          success: true,
          createdAt: MoreThanOrEqual(daysAgo(7)),
        },
      }),
      this.loginEventsRepository.count({
        where: {
          success: true,
          createdAt: MoreThanOrEqual(daysAgo(30)),
        },
      }),
    ]);

    return {
      accounts: {
        total: accounts.length,
        active: accounts.filter((account) => account.status === AccountStatus.ACTIVE).length,
        trial: accounts.filter((account) => account.status === AccountStatus.TRIAL).length,
        pastDue: accounts.filter((account) => account.status === AccountStatus.PAST_DUE).length,
        suspended: accounts.filter((account) => account.status === AccountStatus.SUSPENDED).length,
        cancelled: accounts.filter((account) => account.status === AccountStatus.CANCELLED).length,
      },
      users: {
        total: users.length,
        active: users.filter((user) => user.status === UserStatus.ACTIVE).length,
        pending: users.filter((user) => user.status === UserStatus.PENDING).length,
        disabled: users.filter((user) => user.status === UserStatus.DISABLED).length,
      },
      successfulLogins: {
        last7Days: successfulLogins7d,
        last30Days: successfulLogins30d,
      },
    };
  }

  async listAccounts() {
    const accounts = await this.teamsRepository.find({
      relations: {
        memberships: {
          user: true,
        },
      },
      order: {
        createdAt: 'ASC',
        memberships: {
          createdAt: 'ASC',
        },
      },
    });

    return accounts.map((account) => {
      const users = uniqueUsers(account.memberships.map((membership) => membership.user));
      const lastLoginAt = users
        .map((user) => user.lastLoginAt)
        .filter((value): value is Date => Boolean(value))
        .sort((left, right) => right.getTime() - left.getTime())[0] ?? null;

      return {
        id: account.id,
        name: account.name,
        status: account.status,
        planName: account.planName,
        trialEndsAt: account.trialEndsAt,
        paidUntil: account.paidUntil,
        maxUsers: account.maxUsers,
        suspendedAt: account.suspendedAt,
        suspensionReason: account.suspensionReason,
        whatsappEnabled: account.whatsappEnabled,
        whatsappPhoneNumberId: account.whatsappPhoneNumberId,
        whatsappBusinessAccountId: account.whatsappBusinessAccountId,
        whatsappBusinessNumber: account.whatsappBusinessNumber,
        whatsappDisplayName: account.whatsappDisplayName,
        whatsappAccessToken: account.whatsappAccessToken,
        whatsappTemplateLanguageCode: account.whatsappTemplateLanguageCode,
        whatsappPropertySearchTemplateName: account.whatsappPropertySearchTemplateName,
        whatsappPropertySearchImageTemplateName: account.whatsappPropertySearchImageTemplateName,
        whatsappAppraisalTemplateName: account.whatsappAppraisalTemplateName,
        whatsappQualityRating: account.whatsappQualityRating,
        whatsappTreasuryPhone: account.whatsappTreasuryPhone,
        whatsappConnectedAt: account.whatsappConnectedAt,
        createdAt: account.createdAt,
        memberCount: users.length,
        activeUsersCount: users.filter((user) => user.status === UserStatus.ACTIVE).length,
        pendingUsersCount: users.filter((user) => user.status === UserStatus.PENDING).length,
        disabledUsersCount: users.filter((user) => user.status === UserStatus.DISABLED).length,
        lastLoginAt,
      };
    });
  }

  async updateAccount(id: number, dto: UpdateAdminAccountDto) {
    const account = await this.teamsRepository.findOne({
      where: { id },
      relations: {
        memberships: {
          user: true,
        },
      },
    });

    if (!account) {
      throw new NotFoundException('Cuenta no encontrada');
    }

    if (dto.name) {
      account.name = dto.name.trim();
    }

    if (dto.status) {
      account.status = dto.status;
    }

    if ('planName' in dto) {
      account.planName = dto.planName?.trim() || null;
    }

    if ('trialEndsAt' in dto) {
      account.trialEndsAt = dto.trialEndsAt ? new Date(dto.trialEndsAt) : null;
    }

    if ('paidUntil' in dto) {
      account.paidUntil = dto.paidUntil ? new Date(dto.paidUntil) : null;
    }

    if ('maxUsers' in dto) {
      account.maxUsers = dto.maxUsers ?? null;
    }

    if ('suspensionReason' in dto) {
      account.suspensionReason = dto.suspensionReason?.trim() || null;
    }

    if ('whatsappEnabled' in dto && typeof dto.whatsappEnabled === 'boolean') {
      account.whatsappEnabled = dto.whatsappEnabled;
    }

    if ('whatsappPhoneNumberId' in dto) {
      account.whatsappPhoneNumberId = dto.whatsappPhoneNumberId?.trim() || null;
    }

    if ('whatsappBusinessAccountId' in dto) {
      account.whatsappBusinessAccountId = dto.whatsappBusinessAccountId?.trim() || null;
    }

    if ('whatsappBusinessNumber' in dto) {
      account.whatsappBusinessNumber = dto.whatsappBusinessNumber?.trim() || null;
    }

    if ('whatsappDisplayName' in dto) {
      account.whatsappDisplayName = dto.whatsappDisplayName?.trim() || null;
    }

    if ('whatsappAccessToken' in dto) {
      account.whatsappAccessToken = dto.whatsappAccessToken?.trim() || null;
    }

    if ('whatsappTemplateLanguageCode' in dto) {
      account.whatsappTemplateLanguageCode = dto.whatsappTemplateLanguageCode?.trim() || null;
    }

    if ('whatsappPropertySearchTemplateName' in dto) {
      account.whatsappPropertySearchTemplateName =
        dto.whatsappPropertySearchTemplateName?.trim() || null;
    }

    if ('whatsappPropertySearchImageTemplateName' in dto) {
      account.whatsappPropertySearchImageTemplateName =
        dto.whatsappPropertySearchImageTemplateName?.trim() || null;
    }

    if ('whatsappAppraisalTemplateName' in dto) {
      account.whatsappAppraisalTemplateName =
        dto.whatsappAppraisalTemplateName?.trim() || null;
    }

    if ('whatsappQualityRating' in dto) {
      account.whatsappQualityRating = dto.whatsappQualityRating?.trim() || null;
    }

    if ('whatsappTreasuryPhone' in dto) {
      account.whatsappTreasuryPhone = dto.whatsappTreasuryPhone?.trim() || null;
    }

    if (account.status === AccountStatus.SUSPENDED) {
      account.suspendedAt = account.suspendedAt ?? new Date();
    } else {
      account.suspendedAt = null;
      account.suspensionReason = null;
    }

    account.whatsappConnectedAt = account.whatsappEnabled ? new Date() : null;

    await this.teamsRepository.save(account);

    const [updatedAccount] = await this.listAccountsByIds([account.id]);
    return updatedAccount;
  }

  async listPortalSourceConfigs() {
    return this.portalSourceConfigsRepository.find({
      order: {
        teamId: 'ASC',
        priority: 'ASC',
        createdAt: 'ASC',
      },
    });
  }

  async createPortalSourceConfig(accountId: number, dto: CreatePortalSourceConfigDto) {
    await this.requireAccount(accountId);

    const created = this.portalSourceConfigsRepository.create({
      teamId: accountId,
      providerKey: dto.providerKey,
      enabled: dto.enabled ?? true,
      priority: dto.priority ?? 100,
      baseUrl:
        normalizeAdminPortalBaseUrl(dto.providerKey, dto.baseUrl?.trim()) ||
        defaultPortalBaseUrlByProvider[dto.providerKey] ||
        null,
      rateLimitPerHour: dto.rateLimitPerHour ?? null,
      maxResultsPerRun: dto.maxResultsPerRun ?? 20,
      requiresAuth: dto.requiresAuth ?? false,
      authConfig: dto.authConfig ?? null,
    });

    return this.portalSourceConfigsRepository.save(created);
  }

  async updatePortalSourceConfig(configId: number, dto: UpdatePortalSourceConfigDto) {
    const config = await this.requirePortalSourceConfig(configId);

    if (dto.providerKey) {
      config.providerKey = dto.providerKey;
    }

    if ('enabled' in dto && typeof dto.enabled === 'boolean') {
      config.enabled = dto.enabled;
    }

    if ('priority' in dto) {
      config.priority = dto.priority ?? config.priority;
    }

    if ('baseUrl' in dto) {
      config.baseUrl =
        normalizeAdminPortalBaseUrl(config.providerKey, dto.baseUrl?.trim()) ||
        defaultPortalBaseUrlByProvider[config.providerKey] ||
        null;
    }

    if ('rateLimitPerHour' in dto) {
      config.rateLimitPerHour = dto.rateLimitPerHour ?? null;
    }

    if ('maxResultsPerRun' in dto) {
      config.maxResultsPerRun = dto.maxResultsPerRun ?? null;
    }

    if ('requiresAuth' in dto && typeof dto.requiresAuth === 'boolean') {
      config.requiresAuth = dto.requiresAuth;
    }

    if ('authConfig' in dto) {
      config.authConfig = dto.authConfig ?? null;
    }

    return this.portalSourceConfigsRepository.save(config);
  }

  async deletePortalSourceConfig(configId: number) {
    const config = await this.requirePortalSourceConfig(configId);
    await this.portalSourceConfigsRepository.remove(config);
    return { success: true };
  }

  private async listAccountsByIds(ids: number[]) {
    const accounts = await this.teamsRepository.find({
      where: ids.map((id) => ({ id })),
      relations: {
        memberships: {
          user: true,
        },
      },
    });

    return accounts.map((account) => {
      const users = uniqueUsers(account.memberships.map((membership) => membership.user));
      const lastLoginAt = users
        .map((user) => user.lastLoginAt)
        .filter((value): value is Date => Boolean(value))
        .sort((left, right) => right.getTime() - left.getTime())[0] ?? null;

      return {
        id: account.id,
        name: account.name,
        status: account.status,
        planName: account.planName,
        trialEndsAt: account.trialEndsAt,
        paidUntil: account.paidUntil,
        maxUsers: account.maxUsers,
        suspendedAt: account.suspendedAt,
        suspensionReason: account.suspensionReason,
        whatsappEnabled: account.whatsappEnabled,
        whatsappPhoneNumberId: account.whatsappPhoneNumberId,
        whatsappBusinessAccountId: account.whatsappBusinessAccountId,
        whatsappBusinessNumber: account.whatsappBusinessNumber,
        whatsappDisplayName: account.whatsappDisplayName,
        whatsappAccessToken: account.whatsappAccessToken,
        whatsappTemplateLanguageCode: account.whatsappTemplateLanguageCode,
        whatsappPropertySearchTemplateName: account.whatsappPropertySearchTemplateName,
        whatsappAppraisalTemplateName: account.whatsappAppraisalTemplateName,
        whatsappQualityRating: account.whatsappQualityRating,
        whatsappTreasuryPhone: account.whatsappTreasuryPhone,
        whatsappConnectedAt: account.whatsappConnectedAt,
        createdAt: account.createdAt,
        memberCount: users.length,
        activeUsersCount: users.filter((user) => user.status === UserStatus.ACTIVE).length,
        pendingUsersCount: users.filter((user) => user.status === UserStatus.PENDING).length,
        disabledUsersCount: users.filter((user) => user.status === UserStatus.DISABLED).length,
        lastLoginAt,
      };
    });
  }

  private async requireAccount(id: number) {
    const account = await this.teamsRepository.findOne({ where: { id } });
    if (!account) {
      throw new NotFoundException('Cuenta no encontrada');
    }

    return account;
  }

  private async requirePortalSourceConfig(id: number) {
    const config = await this.portalSourceConfigsRepository.findOne({ where: { id } });
    if (!config) {
      throw new NotFoundException('Fuente de portal no encontrada');
    }

    return config;
  }
}

function daysAgo(days: number) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date;
}

function uniqueUsers(users: User[]) {
  return Array.from(new Map(users.map((user) => [user.id, user])).values());
}

const defaultPortalBaseUrlByProvider: Record<string, string | undefined> = {
  ARGENPROP: 'https://www.argenprop.com',
  ZONAPROP: 'https://zonaprop.com.ar',
  MERCADOLIBRE: 'https://inmuebles.mercadolibre.com.ar',
  MOCK: 'https://mock.propia.local',
};

function normalizeAdminPortalBaseUrl(providerKey: string, value?: string | null) {
  if (!value) {
    return null;
  }

  try {
    const url = new URL(value);
    if (providerKey === 'ZONAPROP' && url.hostname === 'www.zonaprop.com.ar') {
      url.hostname = 'zonaprop.com.ar';
    }
    return url.toString().replace(/\/+$/, '');
  } catch {
    return value.replace(/\/+$/, '');
  }
}
