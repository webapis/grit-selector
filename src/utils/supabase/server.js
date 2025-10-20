import { createClient as supabaseCreateClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

// Support multiple possible env var names shown in Supabase quickstarts
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const createClient = (_cookieStore) => {
  // For simple server-side usage we create a normal supabase client using the
  // publishable key. If you need server-side auth/session cookie integration,
  // install the `@supabase/auth-helpers-nextjs` or `@supabase/ssr` helpers and
  // rework this function to use their server helpers.
  return supabaseCreateClient(supabaseUrl, supabaseKey);
};