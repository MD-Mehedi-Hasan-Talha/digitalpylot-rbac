'use client';

import { usePathname, useRouter } from 'next/navigation';
import { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { api } from '../lib/api';
import { AuthState } from '../types/auth';

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  hasPermission: (permission: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    accessToken: null,
    isLoading: true,
  });
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Attempt to hydrate session on mount
    const initAuth = async () => {
      try {
        // The API client's request method handles 401 and refresh automatically.
        // We'll call /auth/refresh (silent refresh) to see if we have a valid session.
        const response = await fetch('http://localhost:5000/api/auth/refresh', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
        });

        if (response.ok) {
          const data = await response.json();
          api.setToken(data.accessToken);
          setState({
            user: data.user,
            accessToken: data.accessToken,
            isLoading: false,
          });
        } else {
          setState(prev => ({ ...prev, isLoading: false }));
        }
      } catch (err) {
        setState(prev => ({ ...prev, isLoading: false }));
      }
    };

    initAuth();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const data: any = await api.post('/auth/login', { email, password });
      api.setToken(data.accessToken);
      setState({
        user: data.user,
        accessToken: data.accessToken,
        isLoading: false,
      });
      router.push('/dashboard');
    } catch (error) {
      throw error;
    }
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (err) {
      console.error('Logout failed', err);
    } finally {
      api.setToken(null);
      setState({ user: null, accessToken: null, isLoading: false });
      router.push('/login');
    }
  };

  const hasPermission = (permission: string) => {
    return state.user?.permissions.includes(permission) ?? false;
  };

  return (
    <AuthContext.Provider value={{ ...state, login, logout, hasPermission }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
