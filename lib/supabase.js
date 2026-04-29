import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// This check helps catch errors if Vercel hasn't loaded the keys yet
if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Missing Supabase Environment Variables. Please check your Vercel settings.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
