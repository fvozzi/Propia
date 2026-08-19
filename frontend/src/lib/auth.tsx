import { createContext, useContext, useState } from 'react';
import {
  clearOriginalSupportSession,
  clearSession,
  getOriginalSupportSession,
  getStoredUser,
  getToken,
  login as loginRequest,
  storeOriginalSupportSession,
  storeSession,
  switchActiveTeam as switchActiveTeamRequest,
} from './api';
import type { LoginResponse } from '../types';

type AuthContextValue = {
  token: string | null;
  user: LoginResponse['user'] | null;
  isAuthenticated: boolean;
  isImpersonating: boolean;
  login: (email: string, password: string) => Promise<void>;
  completeGoogleLogin: (payload: LoginResponse) => void;
  startImpersonation: (payload: LoginResponse) => void;
  switchTeam: (teamId: number) => Promise<void>;
  exitImpersonation: () => void;
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
    isImpersonating: Boolean(user?.impersonation?.active),
    async login(email: string, password: string) {
      const response = await loginRequest(email, password);
      clearOriginalSupportSession();
      storeSession(response);
      setToken(response.accessToken);
      setUser(response.user);
    },
    completeGoogleLogin(payload: LoginResponse) {
      clearOriginalSupportSession();
      storeSession(payload);
      setToken(payload.accessToken);
      setUser(payload.user);
    },
    startImpersonation(payload: LoginResponse) {
      if (token && user) {
        storeOriginalSupportSession({
          accessToken: token,
          user,
        });
      }

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
    exitImpersonation() {
      const originalSession = getOriginalSupportSession();
      clearOriginalSupportSession();

      if (!originalSession) {
        clearSession();
        setToken(null);
        setUser(null);
        return;
      }

      storeSession(originalSession);
      setToken(originalSession.accessToken);
      setUser(originalSession.user);
    },
    logout() {
      clearOriginalSupportSession();
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
