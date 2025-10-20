export { createClient as createServerSupabaseClient } from '@/utils/supabase/server';
export { default as createBrowserSupabaseClient } from '@/utils/supabase/client';

import createBrowser from '@/utils/supabase/client';
import { createClient as sbCreateClient } from '@supabase/supabase-js';

// Backwards-compatible default exports
export const supabase = createBrowser();

// Choose server key from several possible env var names (supports older and
// newer Supabase key naming conventions).
const adminKeyEnvNames = [
  'SUPABASE_SERVICE_ROLE_KEY',
  'SUPABASE_SECRET_KEY',
  'NEXT_PUBLIC_SUPABASE_SECRET_KEY',
  'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY',
];

let adminKey = null;
let adminKeyName = null;
for (const name of adminKeyEnvNames) {
  if (process.env[name]) {
    adminKey = process.env[name];
    adminKeyName = name;
    break;
  }
}

if (adminKey && adminKeyName) {
  try {
    const masked = `${adminKey.toString().slice(0, 8)}...`;
    console.log('Using server Supabase key from', adminKeyName, '(masked):', masked);
  } catch (e) {
    // ignore
  }
}

export const supabaseAdmin = adminKey
  ? sbCreateClient(process.env.NEXT_PUBLIC_SUPABASE_URL, adminKey)
  : null;

export default supabase;
