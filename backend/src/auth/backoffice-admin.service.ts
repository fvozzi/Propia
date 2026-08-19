import { ConflictException, Injectable, NotFoundException, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { spawn } from 'child_process';
import { existsSync } from 'fs';
import { mkdir, rm, stat } from 'fs/promises';
import * as path from 'path';
import { DataSource, MoreThanOrEqual, Repository } from 'typeorm';
import { AccountStatus, UserStatus } from '../common/enums';
import { PortalSourceConfig } from '../external-search/portal-source-config.entity';
import { CreatePortalSourceConfigDto } from '../external-search/dto/create-portal-source-config.dto';
import { UpdatePortalSourceConfigDto } from '../external-search/dto/update-portal-source-config.dto';
import { AuthService } from './auth.service';
import { DatabaseBackup } from './database-backup.entity';
import { LoginEvent } from './login-event.entity';
import { SystemBackupConfig } from './system-backup-config.entity';
import { Team } from './team.entity';
import { User } from './user.entity';
import { UpdateAdminAccountDto } from './dto/update-admin-account.dto';
import { UpdateSystemBackupConfigDto } from './dto/update-system-backup-config.dto';

const BACKUP_LOCK_ID = 984231;

@Injectable()
export class BackofficeAdminService implements OnModuleInit, OnModuleDestroy {
  private backupInterval: NodeJS.Timeout | null = null;

  constructor(
    @InjectRepository(Team)
    private readonly teamsRepository: Repository<Team>,
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    @InjectRepository(LoginEvent)
    private readonly loginEventsRepository: Repository<LoginEvent>,
    @InjectRepository(PortalSourceConfig)
    private readonly portalSourceConfigsRepository: Repository<PortalSourceConfig>,
    @InjectRepository(SystemBackupConfig)
    private readonly systemBackupConfigsRepository: Repository<SystemBackupConfig>,
    @InjectRepository(DatabaseBackup)
    private readonly databaseBackupsRepository: Repository<DatabaseBackup>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
    private readonly configService: ConfigService,
    private readonly authService: AuthService,
  ) {}

  onModuleInit() {
    if (process.env.NODE_ENV === 'test') {
      return;
    }

    this.backupInterval = setInterval(() => {
      void this.runScheduledBackupCheck();
    }, 60_000);

    void this.runScheduledBackupCheck();
  }

  onModuleDestroy() {
    if (this.backupInterval) {
      clearInterval(this.backupInterval);
      this.backupInterval = null;
    }
  }

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

    return accounts.map((account) => serializeAccount(account));
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

  async getBackupSettings() {
    const [config, backups] = await Promise.all([
      this.ensureBackupConfig(),
      this.listDatabaseBackups(),
    ]);

    return {
      ...serializeBackupConfig(config),
      storagePath: this.getBackupStorageDir(),
      pgDumpBinary: this.getPgDumpBinary(),
      restoreCommandExample:
        'createdb propia_restore && pg_restore --clean --if-exists --no-owner --no-privileges -d propia_restore backup.dump',
      backups,
    };
  }

  async updateBackupSettings(dto: UpdateSystemBackupConfigDto) {
    const config = await this.ensureBackupConfig();
    config.backupsEnabled = dto.backupsEnabled;
    config.retentionCount = dto.retentionCount;
    config.scheduleHourUtc = dto.scheduleHourUtc;
    config.scheduleMinuteUtc = dto.scheduleMinuteUtc;
    await this.systemBackupConfigsRepository.save(config);
    return this.getBackupSettings();
  }

  async listDatabaseBackups() {
    const backups = await this.databaseBackupsRepository.find({
      relations: {
        createdByUser: true,
      },
      order: {
        startedAt: 'DESC',
      },
      take: 60,
    });

    return backups.map((backup) => serializeBackup(backup));
  }

  async runManualBackup(createdByUserId: number | null) {
    await this.executeBackup('MANUAL', createdByUserId);
    return this.getBackupSettings();
  }

  async getBackupDownload(id: number) {
    const backup = await this.databaseBackupsRepository.findOne({
      where: { id },
    });

    if (!backup) {
      throw new NotFoundException('Backup no encontrado');
    }

    if (backup.status !== 'SUCCESS' || !backup.filePath || !backup.fileName) {
      throw new NotFoundException('El backup todavia no esta disponible para descarga');
    }

    if (!existsSync(backup.filePath)) {
      throw new NotFoundException('El archivo de backup ya no existe en el servidor');
    }

    return {
      filePath: backup.filePath,
      fileName: backup.fileName,
    };
  }

  async impersonateUser(
    adminUserId: number,
    targetUserId: number,
    context?: { ipAddress?: string | null; userAgent?: string | null },
  ) {
    return this.authService.impersonateUser(adminUserId, targetUserId, context);
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

    return accounts.map((account) => serializeAccount(account));
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

  private async ensureBackupConfig() {
    const existing = await this.systemBackupConfigsRepository.findOne({
      where: {},
      order: {
        id: 'ASC',
      },
    });

    if (existing) {
      return existing;
    }

    return this.systemBackupConfigsRepository.save(
      this.systemBackupConfigsRepository.create({
        backupsEnabled: true,
        storageProvider: 'LOCAL',
        retentionCount: 30,
        scheduleHourUtc: 3,
        scheduleMinuteUtc: 0,
      }),
    );
  }

  private async runScheduledBackupCheck() {
    const config = await this.ensureBackupConfig();
    if (!config.backupsEnabled) {
      return;
    }

    const now = new Date();
    if (!isPastScheduledTimeUtc(now, config.scheduleHourUtc, config.scheduleMinuteUtc)) {
      return;
    }

    const dayBounds = getUtcDayBounds(now);
    const scheduledCount = await this.databaseBackupsRepository
      .createQueryBuilder('backup')
      .where('backup.triggerType = :triggerType', { triggerType: 'SCHEDULED' })
      .andWhere('backup.startedAt >= :from', { from: dayBounds.from })
      .andWhere('backup.startedAt < :to', { to: dayBounds.to })
      .getCount();

    if (scheduledCount > 0) {
      return;
    }

    try {
      await this.executeBackup('SCHEDULED', null);
    } catch {
      return;
    }
  }

  private async executeBackup(triggerType: 'MANUAL' | 'SCHEDULED', createdByUserId: number | null) {
    const lockAcquired = await this.tryAcquireBackupLock();
    if (!lockAcquired) {
      throw new ConflictException('Ya hay un backup en curso');
    }

    const config = await this.ensureBackupConfig();
    const startedAt = new Date();
    const backup = await this.databaseBackupsRepository.save(
      this.databaseBackupsRepository.create({
        triggerType,
        status: 'RUNNING',
        storageProvider: 'LOCAL',
        createdByUserId,
      }),
    );

    config.lastBackupStartedAt = startedAt;
    config.lastBackupFinishedAt = null;
    config.lastBackupStatus = 'RUNNING';
    config.lastBackupError = null;
    await this.systemBackupConfigsRepository.save(config);

    try {
      const storageDir = this.getBackupStorageDir();
      await mkdir(storageDir, { recursive: true });

      const fileName = buildBackupFileName(startedAt, triggerType);
      const filePath = path.join(storageDir, fileName);

      await runPgDump({
        binary: this.getPgDumpBinary(),
        host: this.configService.getOrThrow<string>('DB_HOST'),
        port: this.configService.get<string>('DB_PORT', '5432'),
        username: this.configService.getOrThrow<string>('DB_USER'),
        password: this.configService.getOrThrow<string>('DB_PASSWORD'),
        database: this.configService.getOrThrow<string>('DB_NAME'),
        outputPath: filePath,
      });

      const fileStats = await stat(filePath);
      backup.status = 'SUCCESS';
      backup.fileName = fileName;
      backup.filePath = filePath;
      backup.fileSizeBytes = String(fileStats.size);
      backup.finishedAt = new Date();
      backup.errorMessage = null;
      await this.databaseBackupsRepository.save(backup);

      config.lastBackupFinishedAt = backup.finishedAt;
      config.lastBackupStatus = 'SUCCESS';
      config.lastBackupError = null;
      await this.systemBackupConfigsRepository.save(config);

      await this.pruneExpiredBackups(config.retentionCount);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Backup failed';
      backup.status = 'FAILED';
      backup.finishedAt = new Date();
      backup.errorMessage = errorMessage;
      await this.databaseBackupsRepository.save(backup);

      config.lastBackupFinishedAt = backup.finishedAt;
      config.lastBackupStatus = 'FAILED';
      config.lastBackupError = errorMessage;
      await this.systemBackupConfigsRepository.save(config);

      throw error;
    } finally {
      await this.releaseBackupLock();
    }
  }

  private async pruneExpiredBackups(retentionCount: number) {
    const backups = await this.databaseBackupsRepository.find({
      where: {
        status: 'SUCCESS',
      },
      order: {
        startedAt: 'DESC',
      },
    });

    const expiredBackups = backups.slice(retentionCount);
    for (const backup of expiredBackups) {
      if (backup.filePath && existsSync(backup.filePath)) {
        await rm(backup.filePath, { force: true });
      }

      await this.databaseBackupsRepository.remove(backup);
    }
  }

  private getBackupStorageDir() {
    const configuredPath = this.configService.get<string>('BACKUP_STORAGE_DIR');
    if (configuredPath?.trim()) {
      return path.resolve(process.cwd(), configuredPath.trim());
    }

    const sharedDirCandidate = path.resolve(process.cwd(), '..', '..', 'shared');
    if (existsSync(sharedDirCandidate)) {
      return path.join(sharedDirCandidate, 'backups');
    }

    return path.resolve(process.cwd(), '..', 'storage', 'backups');
  }

  private getPgDumpBinary() {
    return this.configService.get<string>('PG_DUMP_BINARY', 'pg_dump');
  }

  private async tryAcquireBackupLock() {
    const [result] = await this.dataSource.query('SELECT pg_try_advisory_lock($1) AS locked', [
      BACKUP_LOCK_ID,
    ]);
    return Boolean(result?.locked);
  }

  private async releaseBackupLock() {
    await this.dataSource.query('SELECT pg_advisory_unlock($1)', [BACKUP_LOCK_ID]);
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

function serializeAccount(account: Team) {
  const users = uniqueUsers(account.memberships.map((membership) => membership.user));
  const lastLoginAt =
    users
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
}

function serializeBackupConfig(config: SystemBackupConfig) {
  return {
    id: config.id,
    backupsEnabled: config.backupsEnabled,
    storageProvider: config.storageProvider,
    retentionCount: config.retentionCount,
    scheduleHourUtc: config.scheduleHourUtc,
    scheduleMinuteUtc: config.scheduleMinuteUtc,
    lastBackupStartedAt: config.lastBackupStartedAt,
    lastBackupFinishedAt: config.lastBackupFinishedAt,
    lastBackupStatus: config.lastBackupStatus,
    lastBackupError: config.lastBackupError,
    createdAt: config.createdAt,
    updatedAt: config.updatedAt,
  };
}

function serializeBackup(backup: DatabaseBackup) {
  return {
    id: backup.id,
    triggerType: backup.triggerType,
    status: backup.status,
    storageProvider: backup.storageProvider,
    createdByUserId: backup.createdByUserId,
    createdByUserName: backup.createdByUser?.name ?? null,
    fileName: backup.fileName,
    fileSizeBytes: backup.fileSizeBytes ? Number(backup.fileSizeBytes) : null,
    errorMessage: backup.errorMessage,
    startedAt: backup.startedAt,
    finishedAt: backup.finishedAt,
    canDownload:
      backup.status === 'SUCCESS' && Boolean(backup.filePath && existsSync(backup.filePath)),
  };
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

function buildBackupFileName(startedAt: Date, triggerType: 'MANUAL' | 'SCHEDULED') {
  const stamp = startedAt.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
  return `propia-${stamp}-${triggerType.toLowerCase()}.dump`;
}

function getUtcDayBounds(date: Date) {
  const from = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const to = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + 1),
  );
  return { from, to };
}

function isPastScheduledTimeUtc(date: Date, hourUtc: number, minuteUtc: number) {
  const currentMinutes = date.getUTCHours() * 60 + date.getUTCMinutes();
  const scheduledMinutes = hourUtc * 60 + minuteUtc;
  return currentMinutes >= scheduledMinutes;
}

async function runPgDump(params: {
  binary: string;
  host: string;
  port: string;
  username: string;
  password: string;
  database: string;
  outputPath: string;
}) {
  await new Promise<void>((resolve, reject) => {
    const args = [
      '-h',
      params.host,
      '-p',
      params.port,
      '-U',
      params.username,
      '-d',
      params.database,
      '-F',
      'c',
      '--no-owner',
      '--no-privileges',
      '-f',
      params.outputPath,
    ];

    const processHandle = spawn(params.binary, args, {
      env: {
        ...process.env,
        PGPASSWORD: params.password,
      },
      windowsHide: true,
    });

    let stderr = '';
    processHandle.stderr.on('data', (chunk: Buffer | string) => {
      stderr += chunk.toString();
    });

    processHandle.on('error', (error) => {
      reject(error);
    });

    processHandle.on('close', (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(stderr.trim() || `pg_dump exited with code ${code ?? 'unknown'}`));
    });
  });
}
