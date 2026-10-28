import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key';

if (supabaseUrl === 'https://placeholder.supabase.co') {
  console.warn('⚠️ NEXT_PUBLIC_SUPABASE_URL is missing or undefined in current runtime.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);