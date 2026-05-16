import { createContext, useContext, useState } from 'react';
import {
  clearSession,
  getStoredUser,
  getToken,
  login as loginRequest,
  storeSession,
  switchActiveTeam as switchActiveTeamRequest,
} from './api';
import type { LoginResponse } from '../types';

type AuthContextValue = {
  token: string | null;
  user: LoginResponse['user'] | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  completeGoogleLogin: (payload: LoginResponse) => void;
  switchTeam: (teamId: number) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(() => getToken());
  const [user, setUser] = useState<LoginResponse['user'] | null>(() => getStoredUser());

  const value: AuthContextValue = {
    token,
    user,
    isAuthenticated: Boolean(token),
    async login(email: string, password: string) {
      const response = await loginRequest(email, password);
      storeSession(response);
      setToken(response.accessToken);
      setUser(response.user);
    },
    completeGoogleLogin(payload: LoginResponse) {
      storeSession(payload);
      setToken(payload.accessToken);
      setUser(payload.user);
    },
    async switchTeam(teamId: number) {
      const response = await switchActiveTeamRequest(teamId);
      storeSession(response);
      setToken(response.accessToken);
      setUser(response.user);
    },
    logout() {
      clearSession();
      setToken(null);
      setUser(null);
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }

  return context;
}
