import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as apiModule from './api';

describe('api helpers', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('stores and clears the session in localStorage', () => {
    apiModule.storeSession({
      accessToken: 'jwt-token',
      user: {
        id: 1,
        email: 'agent@propia.local',
        name: 'Agente Demo',
        appRole: 'ADMIN',
        backofficeAccess: true,
        status: 'ACTIVE',
        activeTeamId: 2,
        activeTeamName: 'Demo Team',
        activeTeamWhatsappTreasuryPhone: '+5491130276632',
        teams: [],
        googleCalendarConnected: false,
        impersonation: null,
      },
    });

    expect(apiModule.getToken()).toBe('jwt-token');
    expect(apiModule.getStoredUser()).toMatchObject({
      email: 'agent@propia.local',
      activeTeamId: 2,
    });

    apiModule.clearSession();

    expect(apiModule.getToken()).toBeNull();
    expect(apiModule.getStoredUser()).toBeNull();
  });

  it('builds google auth url from the api base and exposes the current google auth flag', () => {
    expect(apiModule.getGoogleAuthUrl()).toBe(`${apiModule.getApiUrl()}/auth/google`);
    expect(typeof apiModule.isGoogleAuthEnabled()).toBe('boolean');
  });

  it('sends auth and content-type headers when needed', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    vi.stubGlobal('fetch', fetchMock);

    await apiModule.apiRequest(
      '/contacts',
      {
        method: 'POST',
        body: JSON.stringify({ search: 'facu' }),
      },
      'jwt-token',
    );

    expect(fetchMock).toHaveBeenCalledWith(
      `${apiModule.getApiUrl()}/contacts`,
      expect.objectContaining({
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer jwt-token',
        },
      }),
    );
  });

  it('throws backend text errors when the request fails', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response('No autorizado', {
        status: 401,
      }),
    );
    vi.stubGlobal('fetch', fetchMock);

    await expect(apiModule.apiRequest('/contacts')).rejects.toThrow('No autorizado');
  });

  it('throws joined backend validation errors when the request fails with json', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          message: ['firstName should not be empty', 'email must be an email'],
          error: 'Bad Request',
          statusCode: 400,
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        },
      ),
    );
    vi.stubGlobal('fetch', fetchMock);

    await expect(apiModule.apiRequest('/contacts')).rejects.toThrow(
      'firstName should not be empty\nemail must be an email',
    );
  });

  it('clears the session and redirects to login when an authenticated request returns 401', async () => {
    apiModule.storeSession({
      accessToken: 'expired-token',
      user: {
        id: 1,
        email: 'agent@propia.local',
        name: 'Agente Demo',
        appRole: 'ADMIN',
        backofficeAccess: true,
        status: 'ACTIVE',
        activeTeamId: 2,
        activeTeamName: 'Demo Team',
        activeTeamWhatsappTreasuryPhone: '+5491130276632',
        teams: [],
        googleCalendarConnected: false,
        impersonation: null,
      },
    });

    window.history.pushState({}, '', '/activities');
    const redirectSpy = vi
      .spyOn(apiModule.navigation, 'assign')
      .mockImplementation(() => undefined);
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          message: 'jwt expired',
          error: 'Unauthorized',
          statusCode: 401,
        }),
        {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        },
      ),
    );
    vi.stubGlobal('fetch', fetchMock);

    await expect(apiModule.apiRequest('/contacts')).rejects.toThrow('jwt expired');

    expect(apiModule.getToken()).toBeNull();
    expect(apiModule.getStoredUser()).toBeNull();
    expect(redirectSpy).toHaveBeenCalledWith('http://localhost:3000/login?reason=session-expired');
  });
});
