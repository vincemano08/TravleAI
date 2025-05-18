import 'react-native-url-polyfill/auto';
import { createClient, SupabaseClientOptions } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'YOUR_SUPABASE_URL_HERE'; // Replace if not using env
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || ''

// Add debug logging
console.log('[SupabaseClient] Initializing with URL:', supabaseUrl ? 'URL is set' : 'URL is missing');
console.log('[SupabaseClient] Anon Key is', supabaseAnonKey ? 'set' : 'missing');

if (!supabaseUrl || supabaseUrl === 'YOUR_SUPABASE_URL_HERE') {
  console.warn('Supabase URL is not set. Please update it in .env file (EXPO_PUBLIC_SUPABASE_URL).');
}

if (!supabaseAnonKey || supabaseAnonKey === 'YOUR_SUPABASE_ANON_KEY_HERE') {
  console.warn('Supabase Anon Key is not set. Please update it in .env file (EXPO_PUBLIC_SUPABASE_ANON_KEY).');
}

// Explicitly define the type for Supabase client options for clarity
const supabaseOptions: SupabaseClientOptions<"public"> = {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false, // Important for React Native
  },
  global: {
    // @ts-ignore Remove this ignore if/when Supabase types properly include WebSocket for global
    WebSocket: global.WebSocket, // Pass the global WebSocket constructor
  },
};

export const supabase = createClient(supabaseUrl!, supabaseAnonKey!, supabaseOptions); 