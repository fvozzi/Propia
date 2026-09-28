import type { LoginResponse } from '../types';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api';
const GOOGLE_AUTH_ENABLED = import.meta.env.VITE_ENABLE_GOOGLE_AUTH === 'true';
const TOKEN_KEY = 'propia_token';
const USER_KEY = 'propia_user';
const SUPPORT_ORIGINAL_SESSION_KEY = 'propia_support_original_session';

export const navigation = {
  assign(url: string) {
    window.location.assign(url);
  },
};

export function getApiUrl() {
  return API_URL;
}

export function isGoogleAuthEnabled() {
  return GOOGLE_AUTH_ENABLED;
}

export function getGoogleAuthUrl() {
  return `${API_URL}/auth/google`;
}

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function getStoredUser() {
  const raw = localStorage.getItem(USER_KEY);
  return raw ? JSON.parse(raw) : null;
}

export function storeSession(payload: LoginResponse) {
  localStorage.setItem(TOKEN_KEY, payload.accessToken);
  localStorage.setItem(USER_KEY, JSON.stringify(payload.user));
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export function getOriginalSupportSession() {
  const raw = localStorage.getItem(SUPPORT_ORIGINAL_SESSION_KEY);
  return raw ? (JSON.parse(raw) as LoginResponse) : null;
}

export function storeOriginalSupportSession(payload: LoginResponse) {
  localStorage.setItem(SUPPORT_ORIGINAL_SESSION_KEY, JSON.stringify(payload));
}

export function clearOriginalSupportSession() {
  localStorage.removeItem(SUPPORT_ORIGINAL_SESSION_KEY);
}

export function redirectToLoginForSessionExpired() {
  if (typeof window === 'undefined' || window.location.pathname === '/login') {
    return;
  }

  const loginUrl = new URL('/login', window.location.origin);
  loginUrl.searchParams.set('reason', 'session-expired');
  navigation.assign(loginUrl.toString());
}

function extractErrorMessage(payload: unknown): string | null {
  if (typeof payload === 'string') {
    const trimmed = payload.trim();
    return trimmed || null;
  }

  if (Array.isArray(payload)) {
    const messages = payload
      .map((item) => extractErrorMessage(item))
      .filter((item): item is string => Boolean(item));
    return messages.length > 0 ? messages.join('\n') : null;
  }

  if (payload && typeof payload === 'object') {
    const message =
      'message' in payload
        ? extractErrorMessage((payload as { message?: unknown }).message)
        : null;

    if (message) {
      return message;
    }

    if ('error' in payload && typeof (payload as { error?: unknown }).error === 'string') {
      return (payload as { error: string }).error;
    }
  }

  return null;
}

async function buildErrorMessage(response: Response) {
  const contentType = response.headers.get('content-type') ?? '';

  if (contentType.includes('application/json')) {
    const payload = await response.json().catch(() => null);
    return extractErrorMessage(payload) ?? 'Request failed';
  }

  const errorText = (await response.text()).trim();

  if (!errorText) {
    return 'Request failed';
  }

  try {
    const parsed = JSON.parse(errorText) as unknown;
    return extractErrorMessage(parsed) ?? errorText;
  } catch {
    return errorText;
  }
}

export async function apiRequest<T>(
  path: string,
  init: RequestInit = {},
  token = getToken(),
): Promise<T> {
  const headers: Record<string, string> = {
    ...(init.body ? { 'Content-Type': 'application/json' } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  const requestUrl = `${API_URL}${path}`;
  const requestInit: RequestInit = {
    ...init,
    headers,
    cache: init.cache ?? (init.method && init.method !== 'GET' ? init.cache : 'no-store'),
  };

  let response = await fetch(requestUrl, requestInit);

  if (response.status === 304) {
    response = await fetch(requestUrl, {
      ...requestInit,
      cache: 'reload',
    });
  }

  if (!response.ok) {
    const errorMessage = await buildErrorMessage(response);

    if (response.status === 401 && token && typeof window !== 'undefined') {
      clearSession();
      redirectToLoginForSessionExpired();
    }

    throw new Error(errorMessage);
  }

  if (response.status === 204) {
    return null as T;
  }

  return response.json() as Promise<T>;
}

export async function login(email: string, password: string) {
  return apiRequest<LoginResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export async function switchActiveTeam(teamId: number) {
  return apiRequest<LoginResponse>('/auth/active-team', {
    method: 'PATCH',
    body: JSON.stringify({ teamId }),
  });
}

export async function downloadApiFile(path: string) {
  const token = getToken();
  const response = await fetch(`${API_URL}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });

  if (!response.ok) {
    const errorMessage = await buildErrorMessage(response);
    throw new Error(errorMessage);
  }

  return response.blob();
}
