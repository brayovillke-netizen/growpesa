import { createClient } from '@supabase/supabase-js';

let rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
// Auto-add https:// if it's missing
if (rawUrl && !rawUrl.startsWith('http')) {
  rawUrl = `https://${rawUrl}`;
}

const supabaseUrl = rawUrl.startsWith('http') ? rawUrl : 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);