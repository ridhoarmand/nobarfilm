import { createBrowserClient } from '@supabase/ssr';

// Client for use in Client Components
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY || 'placeholder-key';
const supabaseStorageKey = process.env.NEXT_PUBLIC_SUPABASE_STORAGE_KEY || 'nobar-shared-auth-token';

export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey, {
  cookieOptions: {
    name: supabaseStorageKey,
    domain: process.env.NEXT_PUBLIC_COOKIE_DOMAIN,
    path: '/',
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  },
});
