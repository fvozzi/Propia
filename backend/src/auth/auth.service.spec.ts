import { UnauthorizedException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AppUserRole, UserStatus } from '../common/enums';

vi.mock('./google-calendar-connection.entity', () => ({
  GoogleCalendarConnection: class GoogleCalendarConnection {},
}));

vi.mock('./login-event.entity', () => ({
  LoginEvent: class LoginEvent {},
}));

vi.mock('./user.entity', () => ({
  User: class User {},
}));

describe('AuthService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  async function createService(config: { bootstrapAdminEmails?: string } = {}) {
    const { AuthService } = await import('./auth.service');

    const usersRepository = {
      findOne: vi.fn(),
      findOneOrFail: vi.fn(),
      create: vi.fn((payload) => payload),
      save: vi.fn(async (value) => value),
    };
    const googleConnectionsRepository = {
      findOne: vi.fn(),
      create: vi.fn((payload) => payload),
      save: vi.fn(async (value) => value),
    };
    const loginEventsRepository = {
      create: vi.fn((payload) => payload),
      save: vi.fn(async (value) => value),
    };
    const jwtService = {
      signAsync: vi.fn(async () => 'token'),
    };
    const userWorkspaceService = {
      ensurePersonalTeam: vi.fn(async (user) => user),
      loadUserWithWorkspace: vi.fn(),
      setActiveTeam: vi.fn(),
    };
    const configService = {
      get: vi.fn((key: string, defaultValue?: string) =>
        key === 'BOOTSTRAP_ADMIN_EMAILS'
          ? config.bootstrapAdminEmails ?? defaultValue ?? ''
          : defaultValue,
      ),
    };

    const service = new AuthService(
      usersRepository as never,
      googleConnectionsRepository as never,
      loginEventsRepository as never,
      jwtService as never,
      userWorkspaceService as never,
      configService as never,
    );

    return {
      service,
      usersRepository,
      googleConnectionsRepository,
      loginEventsRepository,
      jwtService,
      userWorkspaceService,
    };
  }

  it('creates google users as pending by default and blocks access until approved', async () => {
    const {
      service,
      usersRepository,
      googleConnectionsRepository,
      loginEventsRepository,
      userWorkspaceService,
    } = await createService();

    usersRepository.findOne.mockResolvedValueOnce(null);
    usersRepository.save.mockImplementation(async (value) => ({ id: 17, ...value }));
    userWorkspaceService.ensurePersonalTeam.mockImplementation(async (user) => ({
      ...user,
      activeTeamId: 9,
    }));
    googleConnectionsRepository.findOne.mockResolvedValue(null);
    userWorkspaceService.loadUserWithWorkspace.mockResolvedValue({
      id: 17,
      email: 'nuevo@gmail.com',
      name: 'Usuario Nuevo',
      appRole: AppUserRole.USER,
      backofficeAccess: false,
      status: UserStatus.PENDING,
      activeTeamId: 9,
      activeTeam: { id: 9, name: 'Usuario Nuevo Team', whatsappTreasuryPhone: null },
      memberships: [],
    });

    await expect(
      service.loginWithGoogle({
        accessToken: 'token',
        profile: {
          id: 'google-1',
          displayName: 'Usuario Nuevo',
          emails: [{ value: 'nuevo@gmail.com' }],
        } as never,
      }),
    ).rejects.toThrow(new UnauthorizedException('Usuario pendiente de validacion'));

    expect(usersRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'nuevo@gmail.com',
        appRole: AppUserRole.USER,
        backofficeAccess: false,
        status: UserStatus.PENDING,
      }),
    );
    expect(loginEventsRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'nuevo@gmail.com',
        userId: 17,
        teamId: 9,
        success: false,
        authMethod: 'GOOGLE',
        failureReason: 'ACCESS_DENIED',
      }),
    );
  });

  it('promotes configured bootstrap admin emails on google login', async () => {
    const {
      service,
      usersRepository,
      googleConnectionsRepository,
      jwtService,
      userWorkspaceService,
    } = await createService({
      bootstrapAdminEmails: 'facundov79@gmail.com,otro@propia.com',
    });

    usersRepository.findOne.mockResolvedValueOnce({
      id: 5,
      email: 'facundov79@gmail.com',
      name: 'Facundo',
      appRole: AppUserRole.USER,
      backofficeAccess: false,
      status: UserStatus.DISABLED,
      activeTeamId: 3,
      loginCount: 0,
    });
    usersRepository.save.mockImplementation(async (value) => value);
    userWorkspaceService.ensurePersonalTeam.mockImplementation(async (user) => user);
    googleConnectionsRepository.findOne.mockResolvedValue(null);
    userWorkspaceService.loadUserWithWorkspace.mockResolvedValue({
      id: 5,
      email: 'facundov79@gmail.com',
      name: 'Facundo Vozzi',
      appRole: AppUserRole.ADMIN,
      backofficeAccess: true,
      status: UserStatus.ACTIVE,
      activeTeamId: 3,
      activeTeam: { id: 3, name: 'Facundo Vozzi Team', whatsappTreasuryPhone: null },
      memberships: [{ team: { id: 3, name: 'Facundo Vozzi Team' }, role: 'OWNER' }],
    });

    const response = await service.loginWithGoogle({
      accessToken: 'token',
      profile: {
        id: 'google-2',
        displayName: 'Facundo Vozzi',
        emails: [{ value: 'facundov79@gmail.com' }],
      } as never,
    });

    expect(usersRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 5,
        name: 'Facundo Vozzi',
        appRole: AppUserRole.ADMIN,
        backofficeAccess: true,
        status: UserStatus.ACTIVE,
      }),
    );
    expect(jwtService.signAsync).toHaveBeenCalled();
    expect(response.user).toMatchObject({
      email: 'facundov79@gmail.com',
      appRole: AppUserRole.ADMIN,
      backofficeAccess: true,
      status: UserStatus.ACTIVE,
    });
  });
});
