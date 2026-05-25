import type { LoginResponse } from '../types';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api';
const GOOGLE_AUTH_ENABLED = import.meta.env.VITE_ENABLE_GOOGLE_AUTH === 'true';
const TOKEN_KEY = 'propia_token';
const USER_KEY = 'propia_user';

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
    const errorText = await response.text();
    throw new Error(errorText || 'Request failed');
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
