import 'react-native-url-polyfill/auto'; // Keep this for Supabase
import { createClient, SupabaseClientOptions } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

// 1. Directly access the environment variables
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

// 2. Add runtime checks and clear logging for builds
console.log(
  '[SupabaseClient] Attempting to initialize. URL set:',
  !!supabaseUrl && supabaseUrl !== 'undefined' && supabaseUrl.startsWith('http'),
  'Key set:',
  !!supabaseAnonKey && supabaseAnonKey !== 'undefined' && supabaseAnonKey.length > 10
);

// 3. Throw an error if the variables are not set in a build.

if (!supabaseUrl || supabaseUrl === 'undefined' || !supabaseUrl.startsWith('http')) {
  const message = 'CRITICAL: Supabase URL is not configured. Check environment variables (EXPO_PUBLIC_SUPABASE_URL).';
  console.error(message);
}

if (!supabaseAnonKey || supabaseAnonKey === 'undefined' || supabaseAnonKey.length < 10) {
  const message = 'CRITICAL: Supabase Anon Key is not configured. Check environment variables (EXPO_PUBLIC_SUPABASE_ANON_KEY).';
  console.error(message);
}

// Explicitly define the type for Supabase client options for clarity
const supabaseOptions: SupabaseClientOptions<"public"> = {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
};

// 4. Create the client
export const supabase = createClient(supabaseUrl!, supabaseAnonKey!, supabaseOptions);

console.log('[SupabaseClient] Supabase client instance created (or attempted).');