import React, { createContext, useContext } from 'react';
import type { AuthUser } from './authService';

export type AuthSessionValue = {
  user: AuthUser;
  logout: () => Promise<void>;
  updateUser: (user: AuthUser) => Promise<void>;
};

const AuthSessionContext = createContext<AuthSessionValue | null>(null);

export function AuthSessionProvider({ value, children }: { value: AuthSessionValue; children: React.ReactNode }) {
  return <AuthSessionContext.Provider value={value}>{children}</AuthSessionContext.Provider>;
}

export function useAuthSession() {
  const value = useContext(AuthSessionContext);
  if (!value) throw new Error('useAuthSession must be used inside AuthSessionProvider');
  return value;
}
