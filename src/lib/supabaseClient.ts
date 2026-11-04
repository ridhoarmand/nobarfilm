import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// Proyek Supabase yang sama dengan aplikasi NontonYuk ("akun NobarFilm").
// Kunci publishable memang publik; tiap akun hanya bisa membaca barisnya sendiri (RLS di watch_progress).
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://oozgvjxnucpkkfqkcxba.supabase.co';
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_WohCOp2i0wv7O7jBXJCHmQ__4V-k5lZ';

let client: SupabaseClient | null = null;

/** Klien browser; null di server (riwayat hanya hidup di browser). */
export function getSupabase(): SupabaseClient | null {
  if (typeof window === 'undefined') return null;
  client ??= createClient(SUPABASE_URL, SUPABASE_KEY);
  return client;
}
