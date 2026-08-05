'use client';
import { createContext, useContext, useState, useEffect } from 'react';

export interface UserProfile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
}

export interface AuthContextType {
  user: { id: string; email: string } | null;
  profile: UserProfile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, code: string, inviteCode?: string) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function setAuthCookies(token: string, userData: any) {
  if (typeof document === 'undefined') return;
  const isIdhoDomain = window.location.hostname.endsWith('idho.eu.org');
  const domainAttr = isIdhoDomain ? '; domain=.idho.eu.org' : '';
  const maxAge = '; max-age=2592000; path=/; SameSite=Lax';
  document.cookie = `nobar_token=${encodeURIComponent(token)}${domainAttr}${maxAge}`;
  document.cookie = `nobar_user=${encodeURIComponent(JSON.stringify(userData))}${domainAttr}${maxAge}`;
}

function clearAuthCookies() {
  if (typeof document === 'undefined') return;
  const isIdhoDomain = window.location.hostname.endsWith('idho.eu.org');
  const domainAttr = isIdhoDomain ? '; domain=.idho.eu.org' : '';
  const expires = '; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/';
  document.cookie = `nobar_token=${domainAttr}${expires}`;
  document.cookie = `nobar_user=${domainAttr}${expires}`;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<{ id: string; email: string } | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    // Restore from localStorage or subdomain cookies
    let savedToken = localStorage.getItem('nobarfilm_moviebox_token');
    let savedUser = localStorage.getItem('nobarfilm_moviebox_user');

    if (!savedToken && typeof document !== 'undefined') {
      const matchToken = document.cookie.match(/(?:^|; )nobar_token=([^;]*)/);
      const matchUser = document.cookie.match(/(?:^|; )nobar_user=([^;]*)/);
      if (matchToken && matchUser) {
        try {
          savedToken = decodeURIComponent(matchToken[1]);
          savedUser = decodeURIComponent(matchUser[1]);
          localStorage.setItem('nobarfilm_moviebox_token', savedToken);
          localStorage.setItem('nobarfilm_moviebox_user', savedUser);
        } catch {}
      }
    }

    if (savedToken && savedUser) {
      try {
        const parsed = JSON.parse(savedUser);
        const nextUser = { id: parsed.userId, email: parsed.email || '' };
        const nextProfile = {
          id: parsed.userId,
          full_name: parsed.nickname || null,
          avatar_url: parsed.avatar || null,
        };
        queueMicrotask(() => {
          setUser(nextUser);
          setProfile(nextProfile);
          setIsLoading(false);
        });
        return;
      } catch (e) {
        console.error('Failed to parse saved user:', e);
        localStorage.removeItem('nobarfilm_moviebox_token');
        localStorage.removeItem('nobarfilm_moviebox_user');
        clearAuthCookies();
      }
    }
    queueMicrotask(() => {
      setIsLoading(false);
    });
  }, []);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const json = await res.json();
      if (!res.ok || !json.success || !json.data) {
        throw new Error(json.error || 'Login failed');
      }

      const { token, user: movieboxUser } = json.data;
      const userData = { ...movieboxUser, email };

      localStorage.setItem('nobarfilm_moviebox_token', token);
      localStorage.setItem('nobarfilm_moviebox_user', JSON.stringify(userData));
      setAuthCookies(token, userData);

      setUser({ id: movieboxUser.userId, email });
      setProfile({
        id: movieboxUser.userId,
        full_name: movieboxUser.nickname || null,
        avatar_url: movieboxUser.avatar || null,
      });
    } catch (err) {
      console.error('Login error:', err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (email: string, password: string, code: string, inviteCode: string = '') => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password, code, inviteCode }),
      });

      const json = await res.json();
      if (!res.ok || !json.success || !json.data) {
        throw new Error(json.error || 'Registration failed');
      }

      const { token, user: movieboxUser } = json.data;
      const userData = { ...movieboxUser, email };

      localStorage.setItem('nobarfilm_moviebox_token', token);
      localStorage.setItem('nobarfilm_moviebox_user', JSON.stringify(userData));
      setAuthCookies(token, userData);

      setUser({ id: movieboxUser.userId, email });
      setProfile({
        id: movieboxUser.userId,
        full_name: movieboxUser.nickname || null,
        avatar_url: movieboxUser.avatar || null,
      });
    } catch (err) {
      console.error('Register error:', err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    localStorage.removeItem('nobarfilm_moviebox_token');
    localStorage.removeItem('nobarfilm_moviebox_user');
    clearAuthCookies();
    setUser(null);
    setProfile(null);
  };

  const updateProfile = async (updates: Partial<UserProfile>) => {
    if (profile) {
      const updatedProfile = { ...profile, ...updates };
      setProfile(updatedProfile);
      
      const savedUser = localStorage.getItem('nobarfilm_moviebox_user');
      if (savedUser) {
        try {
          const parsed = JSON.parse(savedUser);
          localStorage.setItem(
            'nobarfilm_moviebox_user',
            JSON.stringify({
              ...parsed,
              nickname: updatedProfile.full_name,
              avatar: updatedProfile.avatar_url,
            })
          );
        } catch (e) {
          console.error(e);
        }
      }
    }
  };

  const value = {
    user,
    profile,
    isLoading,
    isAuthenticated: !!user,
    login,
    register,
    logout,
    updateProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
