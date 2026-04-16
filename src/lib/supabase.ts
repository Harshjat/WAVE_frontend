import { createClient } from '@supabase/supabase-js';

// These environment variables will be pulled from your .env.local file (or Vercel settings)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

// Initialize the Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey);