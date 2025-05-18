import React, { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../api/supabaseClient';
import { useRouter, useSegments } from 'expo-router';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signInWithEmail: (email: string, password: string) => Promise<any>;
  signUpWithEmail: (email: string, password: string) => Promise<any>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    const fetchSession = async () => {
      try {
        setLoading(true);
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) throw error;
        setSession(session);
        setUser(session?.user ?? null);
      } catch (e) {
        console.error("Error fetching session:", e);
      } finally {
        setLoading(false);
      }
    };

    fetchSession();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        // No automatic navigation here, handled by useProtectedRouteEffect
      }
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  // This effect handles redirection based on auth state
  useEffect(() => {
    console.log('[AuthContext] Redirection check: loading:', loading, 'session:', !!session, 'user:', !!user, 'segments:', segments);

    if (loading) {
      console.log('[AuthContext] Still loading session, no redirection yet.');
      return; 
    }

    const currentTopLevelSegment = segments[0] || '' // Handle empty segments array too

    if (session && user) {
      console.log('[AuthContext] User is signed in.');
      if (currentTopLevelSegment !== '(tabs)') {
        console.log(`[AuthContext] User signed in, not in (tabs) (current: ${currentTopLevelSegment}). Redirecting to /(tabs)/home`);
        router.replace('/(tabs)/home');
      } else {
        console.log('[AuthContext] User signed in and already in (tabs) group.');
      }
    } else {
      console.log('[AuthContext] User is NOT signed in.');
      if (currentTopLevelSegment !== '(auth)') {
        console.log(`[AuthContext] User NOT signed in, not in (auth) (current: ${currentTopLevelSegment}). Redirecting to /(auth)/sign-in`);
        router.replace('/(auth)/sign-in');
      } else {
        console.log('[AuthContext] User NOT signed in and already in (auth) group.');
      }
    }
  }, [session, user, segments, loading, router]);

  const signInWithEmail = async (email: string, password: string) => {
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    setLoading(false);
    return { data, error };
    // Navigation handled by useEffect
  };

  const signUpWithEmail = async (email: string, password: string) => {
    setLoading(true);
    try {
      console.log('[AuthContext] Attempting signup for email:', email);
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        // options: { emailRedirectTo: 'yourapp://path' } // Optional: for email confirmation
      });
      
      if (error) {
        console.error('[AuthContext] Signup error:', error.message, error);
      } else {
        console.log('[AuthContext] Signup response:', {
          user: data.user ? 'User created' : 'No user',
          session: data.session ? 'Session created' : 'No session',
          error: error ? 'Has error' : 'No error'
        });
      }
      
      setLoading(false);
      return { data, error };
    } catch (e) {
      console.error('[AuthContext] Unexpected signup error:', e);
      setLoading(false);
      return { data: null, error: e as Error };
    }
  };

  const signOut = async () => {
    setLoading(true);
    await supabase.auth.signOut();
    // User & session will be set to null by onAuthStateChange
    // Navigation handled by useEffect
    setLoading(false);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        signInWithEmail,
        signUpWithEmail,
        signOut,
      }}
    >
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