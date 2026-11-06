import type { SupabaseClient } from '@supabase/supabase-js';

// Proyek Supabase yang sama dengan aplikasi NontonYuk ("akun NobarFilm").
// Kunci publishable memang publik; tiap akun hanya bisa membaca barisnya sendiri (RLS di watch_progress).
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://oozgvjxnucpkkfqkcxba.supabase.co';
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_WohCOp2i0wv7O7jBXJCHmQ__4V-k5lZ';

// Kunci sesi bawaan supabase-js: sb-<ref proyek>-auth-token.
const SESSION_KEY = `sb-${new URL(SUPABASE_URL).hostname.split('.')[0]}-auth-token`;

let client: Promise<SupabaseClient> | null = null;

/** Email sesi tersimpan, dibaca tanpa memuat supabase-js (~73 KB gzip); null = belum login. */
export function storedSessionEmail(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const email = (JSON.parse(raw) as { user?: { email?: string } }).user?.email;
    return email || '';
  } catch {
    return null;
  }
}

/** Klien browser, dimuat saat pertama dipakai; null di server (riwayat hanya hidup di browser). */
export function getSupabase(): Promise<SupabaseClient> | null {
  if (typeof window === 'undefined') return null;
  client ??= import('@supabase/supabase-js').then(({ createClient }) => createClient(SUPABASE_URL, SUPABASE_KEY));
  return client;
}
