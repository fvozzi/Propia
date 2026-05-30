import { NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PortalProviderKey } from '../common/enums';

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
      portalSourceConfigsRepository,
    };
  }

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

  it('throws when deleting a portal source config that does not exist', async () => {
    const { service, portalSourceConfigsRepository } = await createService();
    portalSourceConfigsRepository.findOne.mockResolvedValue(null);

    await expect(service.deletePortalSourceConfig(99)).rejects.toThrow(NotFoundException);
  });
});
