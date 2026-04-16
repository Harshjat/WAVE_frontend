import { createClient } from '@supabase/supabase-js';

// Your public Supabase credentials
const supabaseUrl = "https://xuqantohbwthrnpfxehu.supabase.co";
const supabaseKey = "sb_publishable_gOMXPBFCQjn1sYyEiXeOTQ_2FnL3tTY"; 

export const supabase = createClient(supabaseUrl, supabaseKey);