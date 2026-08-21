import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { getToken, clearAll, getApiUrl, getUserInfo } from '@/lib/storage';
import { healthCheck } from '@/api/client';

type AuthState = {
  isLoading: boolean;
  isAuthenticated: boolean;
  apiUrl: string | null;
  displayName: string | null;
  email: string | null;
  signOut: () => Promise<void>;
  refreshAuth: () => Promise<void>;
};

const AuthContext = createContext<AuthState>({
  isLoading: true,
  isAuthenticated: false,
  apiUrl: null,
  displayName: null,
  email: null,
  signOut: async () => {},
  refreshAuth: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<Omit<AuthState, 'signOut' | 'refreshAuth'>>({
    isLoading: true,
    isAuthenticated: false,
    apiUrl: null,
    displayName: null,
    email: null,
  });

  const checkAuth = useCallback(async () => {
    const token = await getToken();
    if (!token) {
      setState((s) => ({ ...s, isLoading: false, isAuthenticated: false }));
      return;
    }

    const apiUrl = await getApiUrl();
    const { displayName, email } = await getUserInfo();

    if (apiUrl) {
      const { error } = await healthCheck();
      if (error?.code === 'AUTH') {
        await clearAll();
        setState((s) => ({ ...s, isLoading: false, isAuthenticated: false }));
        return;
      }
    }

    setState({
      isLoading: false,
      isAuthenticated: true,
      apiUrl,
      displayName,
      email,
    });
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const signOut = useCallback(async () => {
    await clearAll();
    setState({
      isLoading: false,
      isAuthenticated: false,
      apiUrl: null,
      displayName: null,
      email: null,
    });
  }, []);

  return (
    <AuthContext.Provider
      value={{
        ...state,
        signOut,
        refreshAuth: checkAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
