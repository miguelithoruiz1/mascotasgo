import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase.ts';

export interface AppUser {
  uid: string;
  id: string;
  email: string | null;
  displayName: string;
  photoURL: string | null;
}

interface AuthContextType {
  user: AppUser | null;
  loading: boolean;
  isConfigured: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string, name?: string) => Promise<void>;
  signOut: () => Promise<void>;
  getIdToken: () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  isConfigured: false,
  signInWithGoogle: async () => {},
  signInWithEmail: async () => {},
  signUpWithEmail: async () => {},
  signOut: async () => {},
  getIdToken: async () => null,
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      setLoading(false);
      return;
    }

    // 1. Obtener la sesión activa inicial de Supabase
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        const u = session.user;
        const mappedUser: AppUser = {
          uid: u.id,
          id: u.id,
          email: u.email || null,
          displayName:
            (u.user_metadata?.full_name as string) ||
            (u.user_metadata?.name as string) ||
            (u.email ? u.email.split('@')[0] : 'Entrenador'),
          photoURL: (u.user_metadata?.avatar_url as string) || null,
        };
        setUser(mappedUser);
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    // 2. Suscribirse a cambios de estado de autenticación (login, logout, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (session?.user) {
          const u = session.user;
          const mappedUser: AppUser = {
            uid: u.id,
            id: u.id,
            email: u.email || null,
            displayName:
              (u.user_metadata?.full_name as string) ||
              (u.user_metadata?.name as string) ||
              (u.email ? u.email.split('@')[0] : 'Entrenador'),
            photoURL: (u.user_metadata?.avatar_url as string) || null,
          };
          setUser(mappedUser);

          // Sincronizar perfil con el backend Express
          try {
            await fetch('/api/auth/sync', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${session.access_token}`,
              },
              body: JSON.stringify({
                name: mappedUser.displayName,
                avatar: mappedUser.photoURL || '🧑‍🌾',
              }),
            });
          } catch (err) {
            console.warn('[AuthContext] Backend sync diferido:', err);
          }
        } else {
          setUser(null);
        }
        setLoading(false);
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signInWithGoogle = async () => {
    if (!isSupabaseConfigured || !supabase) {
      throw new Error('Supabase no está configurado en el entorno.');
    }
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
      },
    });
    if (error) {
      console.error('[Supabase Auth] Google OAuth error:', error);
      throw error;
    }
  };

  const signInWithEmail = async (email: string, password: string) => {
    if (!isSupabaseConfigured || !supabase) {
      throw new Error('Supabase no está configurado en el entorno.');
    }
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    if (error) {
      console.error('[Supabase Auth] Sign-in error:', error);
      throw error;
    }
  };

  const signUpWithEmail = async (email: string, password: string, name?: string) => {
    if (!isSupabaseConfigured || !supabase) {
      throw new Error('Supabase no está configurado en el entorno.');
    }
    const { error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: {
          full_name: name?.trim() || 'Entrenador',
        },
      },
    });
    if (error) {
      console.error('[Supabase Auth] Sign-up error:', error);
      throw error;
    }
  };

  const signOut = async () => {
    if (supabase) {
      try {
        await supabase.auth.signOut();
      } catch (err) {
        console.error('[Supabase Auth] Sign-out error:', err);
      }
    }
    setUser(null);
  };

  const getIdToken = async (): Promise<string | null> => {
    if (!supabase) return null;
    try {
      const { data } = await supabase.auth.getSession();
      return data.session?.access_token || null;
    } catch {
      return null;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isConfigured: isSupabaseConfigured,
        signInWithGoogle,
        signInWithEmail,
        signUpWithEmail,
        signOut,
        getIdToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
