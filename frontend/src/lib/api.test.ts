import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiRequest, clearSession, getApiUrl, getGoogleAuthUrl, getStoredUser, getToken, isGoogleAuthEnabled, storeSession } from './api';

describe('api helpers', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('stores and clears the session in localStorage', () => {
    storeSession({
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
      },
    });

    expect(getToken()).toBe('jwt-token');
    expect(getStoredUser()).toMatchObject({
      email: 'agent@propia.local',
      activeTeamId: 2,
    });

    clearSession();

    expect(getToken()).toBeNull();
    expect(getStoredUser()).toBeNull();
  });

  it('builds google auth url from the api base and exposes the current google auth flag', () => {
    expect(getGoogleAuthUrl()).toBe(`${getApiUrl()}/auth/google`);
    expect(typeof isGoogleAuthEnabled()).toBe('boolean');
  });

  it('sends auth and content-type headers when needed', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    vi.stubGlobal('fetch', fetchMock);

    await apiRequest(
      '/contacts',
      {
        method: 'POST',
        body: JSON.stringify({ search: 'facu' }),
      },
      'jwt-token',
    );

    expect(fetchMock).toHaveBeenCalledWith(
      `${getApiUrl()}/contacts`,
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

    await expect(apiRequest('/contacts')).rejects.toThrow('No autorizado');
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

    await expect(apiRequest('/contacts')).rejects.toThrow(
      'firstName should not be empty\nemail must be an email',
    );
  });
});
