import React, { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/core/api/supabaseClient';
import { useRouter, useSegments } from 'expo-router';

// Define a UserProfile interface
interface UserProfile {
  id: string;
  username: string;
  full_name?: string | null;
  avatar_url?: string | null;
  updated_at?: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null; // Added profile
  loading: boolean;
  signInWithEmail: (email: string, password: string) => Promise<any>;
  signUpWithEmail: (email: string, password: string, username: string) => Promise<any>; // Updated signature
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null); // Added profile state
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const segments = useSegments();

  const fetchUserProfile = async (userId: string) => {
    console.log('[AuthContext] Fetching profile for user ID:', userId);
    try {
      const { data, error, status } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error && status !== 406) { // 406: No rows found, not an error immediately after signup
        console.error('[AuthContext] Error fetching profile:', error);
        // Not throwing error here, as profile might not exist yet
        setProfile(null);
        return;
      }
      if (data) {
        console.log('[AuthContext] Profile data received:', data);
        setProfile(data as UserProfile);
      } else {
        console.log('[AuthContext] No profile data found for user ID:', userId);
        setProfile(null);
      }
    } catch (e) {
      console.error('[AuthContext] Exception in fetchUserProfile:', e);
      setProfile(null);
    }
  };

  useEffect(() => {
    const fetchInitialData = async () => {
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

    fetchInitialData();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (_event, newSession) => {
        console.log("[AuthContext] onAuthStateChange event:", _event, "newSession:", !!newSession);
        setLoading(true); // Set loading true while potentially fetching profile
        setSession(newSession);
        setUser(newSession?.user ?? null);
        if (newSession?.user) {
          await fetchUserProfile(newSession.user.id);
        } else {
          setProfile(null); // Clear profile on sign out
        }
        setLoading(false); // Set loading false after state updates
      }
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const signInWithEmail = async (email: string, password: string) => {
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    // user, session, and profile will be updated by onAuthStateChange
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
            username: username,
            full_name: username, // Defaulting full_name to username
            avatar_url: null     // Defaulting avatar_url to null
          },
        }
      });
      
      if (error) {
        console.error('[AuthContext] Signup error:', error.message, error);
        // throw error; // Let the calling screen handle the alert
      } else {
        console.log('[AuthContext] Signup response:', {
          user: data.user ? 'User created' : 'No user',
          session: data.session ? 'Session created' : 'No session',
        });
        // User, session will be set by onAuthStateChange. Profile will be fetched too.
        // If email confirmation is on, data.user will exist but data.session might be null.
        // If email confirmation is off, data.session will likely exist.
      }
      setLoading(false);
      return { data, error }; // Return the original response
    } catch (e: any) {
      console.error('[AuthContext] Unexpected signup error:', e);
      setLoading(false);
      return { data: null, error: e as Error }; 
    }
  };

  const signOut = async () => {
    setLoading(true);
    await supabase.auth.signOut();
    // User, session, and profile will be set to null by onAuthStateChange
    setLoading(false);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile, // Expose profile
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