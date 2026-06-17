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
  register: (email: string, password: string, fullName?: string) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<{ id: string; email: string } | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    // Restore from localStorage
    const savedToken = localStorage.getItem('nobarfilm_moviebox_token');
    const savedUser = localStorage.getItem('nobarfilm_moviebox_user');

    if (savedToken && savedUser) {
      try {
        const parsed = JSON.parse(savedUser);
        setUser({ id: parsed.userId, email: parsed.email || '' });
        setProfile({
          id: parsed.userId,
          full_name: parsed.nickname || null,
          avatar_url: parsed.avatar || null,
        });
      } catch (e) {
        console.error('Failed to parse saved user:', e);
        localStorage.removeItem('nobarfilm_moviebox_token');
        localStorage.removeItem('nobarfilm_moviebox_user');
      }
    }
    setIsLoading(false);
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

      localStorage.setItem('nobarfilm_moviebox_token', token);
      localStorage.setItem(
        'nobarfilm_moviebox_user',
        JSON.stringify({ ...movieboxUser, email })
      );

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

  const register = async () => {
    throw new Error('Registration is not supported. Please register via the MovieBox app.');
  };

  const logout = async () => {
    localStorage.removeItem('nobarfilm_moviebox_token');
    localStorage.removeItem('nobarfilm_moviebox_user');
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
