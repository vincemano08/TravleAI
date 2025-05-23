import React, { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../api/supabaseClient';
import { useRouter, useSegments } from 'expo-router';

interface UserProfile {
  id: string;
  username: string;
  email?: string | null;
  updated_at?: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  loading: boolean;
  signInWithEmail: (email: string, password: string) => Promise<any>;
  signUpWithEmail: (email: string, password: string, username: string) => Promise<any>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const segments = useSegments();

  const fetchUserProfile = async (userId: string) => {
    console.log('[AuthContext] Fetching profile for user ID:', userId);
    try {
      const { data, error, status } = await supabase
        .from('profiles')
        .select('id, username, email, updated_at')
        .eq('id', userId)
        .single();

      if (error && status !== 406) {
        console.error('[AuthContext] Error fetching profile:', error);
        setProfile(null); 
        return;
      }
      if (data) {
        console.log('[AuthContext] Profile data received:', data);
        setProfile(data as UserProfile);
      } else {
        console.log('[AuthContext] No profile data found for user ID (may be normal if just signed up):', userId);
        setProfile(null);
      }
    } catch (e) {
      console.error('[AuthContext] Exception in fetchUserProfile:', e);
      setProfile(null);
    }
  };

  useEffect(() => {
    const initializeAuth = async () => {
      setLoading(true);
      const { data: { session: currentSession }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError) {
        console.error("[AuthContext] Error fetching initial session:", sessionError);
      } else if (currentSession?.user) {
        setSession(currentSession);
        setUser(currentSession.user);
        await fetchUserProfile(currentSession.user.id);
      } else {
        setSession(null);
        setUser(null);
        setProfile(null);
      }
      setLoading(false);
    };

    initializeAuth();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (_event, newSession) => {
        console.log("[AuthContext] onAuthStateChange event:", _event, "newSession:", !!newSession);
        setLoading(true);
        setSession(newSession);
        setUser(newSession?.user ?? null);
        if (newSession?.user) {
          await fetchUserProfile(newSession.user.id);
        } else {
          setProfile(null); 
        }
        setLoading(false);
      }
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    console.log('[AuthContext] Redirection check: loading:', loading, 'session:', !!session, 'user:', !!user, 'segments:', segments);

    if (loading) {
      console.log('[AuthContext] Still loading session, no redirection yet.');
      return;
    }

    const currentTopLevelSegment = segments[0] || ''

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
  };

  const signUpWithEmail = async (email: string, password: string, username: string) => {
    setLoading(true);
    try {
      console.log('[AuthContext] Attempting signup for email:', email, 'with username:', username);
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            username: username
          },
        }
      });
      
      if (error) {
        console.error('[AuthContext] Signup error:', error.message, error);
      } else {
        console.log('[AuthContext] Signup API call successful:', {
          user: data.user ? 'User object present' : 'No user object',
          session: data.session ? 'Session object present' : 'No session object'
        });
      }
      setLoading(false);
      return { data, error };
    } catch (e: any) {
      console.error('[AuthContext] Unexpected error in signUpWithEmail:', e);
      setLoading(false);
      return { data: null, error: e as Error };
    }
  };

  const signOut = async () => {
    setLoading(true);
    await supabase.auth.signOut();
    setLoading(false);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile, 
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