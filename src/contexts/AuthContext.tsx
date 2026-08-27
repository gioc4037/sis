import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User as SupabaseUser } from '@supabase/supabase-js';
import { supabase } from '../config/supabase';
import { User } from '../types';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signUp: (username: string, password: string, fullName: string) => Promise<{ error?: string }>;
  signIn: (username: string, password: string) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        fetchUserProfile(session.user);
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session?.user) {
        fetchUserProfile(session.user);
      } else {
        setUser(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function fetchUserProfile(authUser: SupabaseUser) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .single();

      if (error) throw error;
      setUser(data);
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  }

  async function signUp(username: string, password: string, fullName: string) {
    try {
      const syntheticEmail = `${username}@sis-app.local`;

      const { data: existing } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', username)
        .maybeSingle();

      if (existing) {
        return { error: 'El nombre de usuario ya esta en uso' };
      }

      const { data: currentSession } = await supabase.auth.getSession();

      const { error } = await supabase.auth.signUp({
        email: syntheticEmail,
        password,
        options: {
          data: { full_name: fullName, username, role: 'user' },
        },
      });

      if (error) throw error;

      if (currentSession?.session) {
        await supabase.auth.setSession({
          access_token: currentSession.session.access_token,
          refresh_token: currentSession.session.refresh_token,
        });
      }

      return {};
    } catch (error: any) {
      return { error: error.message };
    }
  }

  async function signIn(username: string, password: string) {
    try {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('email, username')
        .eq('username', username)
        .maybeSingle();

      if (profileError) throw profileError;
      if (!profile) return { error: 'Usuario no encontrado' };

      const { error } = await supabase.auth.signInWithPassword({
        email: profile.email,
        password,
      });
      if (error) throw error;
      return {};
    } catch (error: any) {
      return { error: error.message };
    }
  }

  async function signOut() {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
  }

  return (
    <AuthContext.Provider value={{ session, user, loading, signUp, signIn, signOut }}>
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
