import { NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AccountStatus, PortalProviderKey, UserStatus } from '../common/enums';

vi.mock('../external-search/portal-source-config.entity', () => ({
  PortalSourceConfig: class PortalSourceConfig {},
}));

vi.mock('./login-event.entity', () => ({
  LoginEvent: class LoginEvent {},
}));

vi.mock('./team.entity', () => ({
  Team: class Team {},
}));

vi.mock('./user.entity', () => ({
  User: class User {},
}));

describe('BackofficeAdminService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  async function createService() {
    const { BackofficeAdminService } = await import('./backoffice-admin.service');
    const teamsRepository = {
      find: vi.fn(),
      findOne: vi.fn(),
      save: vi.fn(async (value) => value),
    };
    const usersRepository = {
      find: vi.fn(),
    };
    const loginEventsRepository = {
      count: vi.fn(),
    };
    const portalSourceConfigsRepository = {
      find: vi.fn(),
      findOne: vi.fn(),
      create: vi.fn((payload) => payload),
      save: vi.fn(async (value) => value),
      remove: vi.fn(async (value) => value),
    };

    const service = new BackofficeAdminService(
      teamsRepository as never,
      usersRepository as never,
      loginEventsRepository as never,
      portalSourceConfigsRepository as never,
    );

    return {
      service,
      teamsRepository,
      usersRepository,
      loginEventsRepository,
      portalSourceConfigsRepository,
    };
  }

  it('aggregates overview metrics for accounts, users and successful logins', async () => {
    const { service, teamsRepository, usersRepository, loginEventsRepository } =
      await createService();

    teamsRepository.find.mockResolvedValue([
      { id: 1, status: AccountStatus.ACTIVE },
      { id: 2, status: AccountStatus.TRIAL },
      { id: 3, status: AccountStatus.SUSPENDED },
    ]);
    usersRepository.find.mockResolvedValue([
      { id: 1, status: UserStatus.ACTIVE },
      { id: 2, status: UserStatus.PENDING },
      { id: 3, status: UserStatus.DISABLED },
      { id: 4, status: UserStatus.ACTIVE },
    ]);
    loginEventsRepository.count
      .mockResolvedValueOnce(7)
      .mockResolvedValueOnce(19);

    const overview = await service.getOverview();

    expect(overview).toEqual({
      accounts: {
        total: 3,
        active: 1,
        trial: 1,
        pastDue: 0,
        suspended: 1,
        cancelled: 0,
      },
      users: {
        total: 4,
        active: 2,
        pending: 1,
        disabled: 1,
      },
      successfulLogins: {
        last7Days: 7,
        last30Days: 19,
      },
    });
  });

  it('creates a Mercado Libre portal source with the default base url', async () => {
    const { service, teamsRepository, portalSourceConfigsRepository } = await createService();
    teamsRepository.findOne.mockResolvedValue({ id: 12, name: 'Demo Team' });

    const created = await service.createPortalSourceConfig(12, {
      providerKey: PortalProviderKey.MERCADOLIBRE,
    });

    expect(teamsRepository.findOne).toHaveBeenCalledWith({ where: { id: 12 } });
    expect(portalSourceConfigsRepository.create).toHaveBeenCalledWith({
      teamId: 12,
      providerKey: PortalProviderKey.MERCADOLIBRE,
      enabled: true,
      priority: 100,
      baseUrl: 'https://inmuebles.mercadolibre.com.ar',
      rateLimitPerHour: null,
      maxResultsPerRun: 20,
      requiresAuth: false,
      authConfig: null,
    });
    expect(created).toMatchObject({
      teamId: 12,
      providerKey: PortalProviderKey.MERCADOLIBRE,
      baseUrl: 'https://inmuebles.mercadolibre.com.ar',
    });
  });

  it('updates a zonaprop config and normalizes the host without www', async () => {
    const { service, portalSourceConfigsRepository } = await createService();
    portalSourceConfigsRepository.findOne.mockResolvedValue({
      id: 9,
      teamId: 12,
      providerKey: PortalProviderKey.ZONAPROP,
      enabled: true,
      priority: 100,
      baseUrl: 'https://www.zonaprop.com.ar',
      rateLimitPerHour: null,
      maxResultsPerRun: 20,
      requiresAuth: false,
      authConfig: null,
    });

    const updated = await service.updatePortalSourceConfig(9, {
      baseUrl: 'https://www.zonaprop.com.ar/ph/venta/caballito/',
      maxResultsPerRun: 40,
    });

    expect(portalSourceConfigsRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 9,
        providerKey: PortalProviderKey.ZONAPROP,
        baseUrl: 'https://zonaprop.com.ar/ph/venta/caballito',
        maxResultsPerRun: 40,
      }),
    );
    expect(updated).toMatchObject({
      id: 9,
      baseUrl: 'https://zonaprop.com.ar/ph/venta/caballito',
      maxResultsPerRun: 40,
    });
  });

  it('switches provider and falls back to the new default base url when none is provided', async () => {
    const { service, portalSourceConfigsRepository } = await createService();
    portalSourceConfigsRepository.findOne.mockResolvedValue({
      id: 13,
      teamId: 12,
      providerKey: PortalProviderKey.MOCK,
      enabled: true,
      priority: 100,
      baseUrl: 'https://mock.propia.local',
      rateLimitPerHour: null,
      maxResultsPerRun: 20,
      requiresAuth: false,
      authConfig: null,
    });

    const updated = await service.updatePortalSourceConfig(13, {
      providerKey: PortalProviderKey.MERCADOLIBRE,
      baseUrl: '',
    });

    expect(updated).toMatchObject({
      id: 13,
      providerKey: PortalProviderKey.MERCADOLIBRE,
      baseUrl: 'https://inmuebles.mercadolibre.com.ar',
    });
  });

  it('marks accounts as suspended and timestamps the operational lock', async () => {
    const { service, teamsRepository } = await createService();
    const existingDate = new Date('2026-07-01T10:00:00.000Z');
    teamsRepository.findOne.mockResolvedValue({
      id: 21,
      name: 'Cuenta Demo',
      status: AccountStatus.ACTIVE,
      planName: null,
      trialEndsAt: null,
      paidUntil: null,
      maxUsers: null,
      suspendedAt: null,
      suspensionReason: null,
      whatsappEnabled: false,
      whatsappPhoneNumberId: null,
      whatsappBusinessAccountId: null,
      whatsappBusinessNumber: null,
      whatsappDisplayName: null,
      whatsappAccessToken: null,
      whatsappTemplateLanguageCode: null,
      whatsappPropertySearchTemplateName: null,
      whatsappPropertySearchImageTemplateName: null,
      whatsappAppraisalTemplateName: null,
      whatsappQualityRating: null,
      whatsappTreasuryPhone: null,
      whatsappConnectedAt: null,
      createdAt: existingDate,
      memberships: [
        { createdAt: existingDate, user: { id: 3, status: UserStatus.ACTIVE, lastLoginAt: null } },
      ],
    });
    teamsRepository.find.mockResolvedValue([
      {
        id: 21,
        name: 'Cuenta Demo',
        status: AccountStatus.SUSPENDED,
        planName: null,
        trialEndsAt: null,
        paidUntil: null,
        maxUsers: null,
        suspendedAt: expect.any(Date),
        suspensionReason: 'Pago vencido',
        whatsappEnabled: false,
        whatsappPhoneNumberId: null,
        whatsappBusinessAccountId: null,
        whatsappBusinessNumber: null,
        whatsappDisplayName: null,
        whatsappAccessToken: null,
        whatsappTemplateLanguageCode: null,
        whatsappPropertySearchTemplateName: null,
        whatsappAppraisalTemplateName: null,
        whatsappQualityRating: null,
        whatsappTreasuryPhone: null,
        whatsappConnectedAt: null,
        createdAt: existingDate,
        memberships: [
          { createdAt: existingDate, user: { id: 3, status: UserStatus.ACTIVE, lastLoginAt: null } },
        ],
      },
    ]);

    const updated = await service.updateAccount(21, {
      status: AccountStatus.SUSPENDED,
      suspensionReason: 'Pago vencido',
    });

    expect(teamsRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 21,
        status: AccountStatus.SUSPENDED,
        suspensionReason: 'Pago vencido',
        suspendedAt: expect.any(Date),
      }),
    );
    expect(updated).toMatchObject({
      id: 21,
      status: AccountStatus.SUSPENDED,
      suspensionReason: 'Pago vencido',
    });
  });

  it('throws when deleting a portal source config that does not exist', async () => {
    const { service, portalSourceConfigsRepository } = await createService();
    portalSourceConfigsRepository.findOne.mockResolvedValue(null);

    await expect(service.deletePortalSourceConfig(99)).rejects.toThrow(NotFoundException);
  });
});
