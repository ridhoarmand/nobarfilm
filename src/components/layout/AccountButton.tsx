'use client';
import { useEffect, useRef, useState } from 'react';
import { Loader2, UserRound, X } from 'lucide-react';
import { getSupabase } from '@/lib/supabaseClient';
import { pushLocalHistory, syncFromRemote } from '@/lib/watchSync';

/**
 * Login opsional dengan akun NobarFilm (akun yang sama dengan aplikasi NontonYuk).
 * Web tetap bisa dipakai tanpa akun; login hanya menyinkronkan "Lanjutkan menonton" dengan HP.
 */
export function AccountButton() {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [formEmail, setFormEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => setEmail(data.session?.user.email ?? null));
    const { data } = supabase.auth.onAuthStateChange((_event, session) => setEmail(session?.user.email ?? null));
    return () => data.subscription.unsubscribe();
  }, []);

  const open = () => {
    setError('');
    dialogRef.current?.showModal();
  };
  const close = () => dialogRef.current?.close();

  const signIn = async (event: React.FormEvent) => {
    event.preventDefault();
    const supabase = getSupabase();
    if (!supabase) return;
    if (!formEmail.trim() || password.length < 6) {
      setError('Email perlu diisi; password minimal 6 karakter.');
      return;
    }
    setBusy(true);
    setError('');
    const { error: authError } = await supabase.auth.signInWithPassword({ email: formEmail.trim(), password });
    if (authError) {
      setBusy(false);
      setError(authError.message.includes('Invalid login') ? 'Email atau password salah.' : 'Gagal masuk. Periksa koneksi lalu coba lagi.');
      return;
    }
    await pushLocalHistory();
    if (await syncFromRemote()) window.dispatchEvent(new CustomEvent('nobarfilm_watch_history_updated'));
    setBusy(false);
    setPassword('');
    close();
  };

  const signOut = async () => {
    await getSupabase()?.auth.signOut();
    close();
  };

  return (
    <>
      <button
        type="button"
        onClick={open}
        aria-label={email ? `Akun NobarFilm: ${email}` : 'Masuk dengan akun NobarFilm'}
        className={`flex size-11 shrink-0 items-center justify-center rounded-xl border transition-colors ${
          email ? 'border-red-500/40 bg-red-500/10 text-red-300 hover:bg-red-500/20' : 'border-white/10 bg-white/5 text-zinc-200 hover:bg-white/10'
        }`}
      >
        <UserRound className="size-5" aria-hidden="true" />
      </button>

      <dialog
        ref={dialogRef}
        aria-labelledby="account-dialog-title"
        className="m-auto w-[min(26rem,calc(100vw-2rem))] rounded-2xl border border-zinc-800 bg-zinc-900 p-0 text-white backdrop:bg-black/80"
      >
        <div className="flex items-start justify-between gap-3 border-b border-zinc-800 p-5">
          <div>
            <h2 id="account-dialog-title" className="text-base font-semibold">
              {email ? 'Akun NobarFilm' : 'Masuk dengan akun NobarFilm'}
            </h2>
            <p className="mt-1 text-sm text-zinc-400">
              {email
                ? 'Lanjutkan menonton tersinkron dengan aplikasi NontonYuk di HP.'
                : 'Opsional. Dengan akun yang sama seperti di aplikasi NontonYuk, progres tonton ikut ke HP dan sebaliknya.'}
            </p>
          </div>
          <button type="button" onClick={close} aria-label="Tutup" className="flex size-11 shrink-0 items-center justify-center rounded-xl text-zinc-400 hover:bg-zinc-800 hover:text-white">
            <X className="size-5" aria-hidden="true" />
          </button>
        </div>

        {email ? (
          <div className="space-y-4 p-5">
            <p className="text-sm">
              Masuk sebagai <span className="font-semibold">{email}</span>
            </p>
            <button type="button" onClick={signOut} className="min-h-11 w-full rounded-xl bg-zinc-800 text-sm font-semibold hover:bg-zinc-700">
              Keluar
            </button>
          </div>
        ) : (
          <form onSubmit={signIn} className="space-y-4 p-5">
            <label className="block text-sm font-medium text-zinc-300">
              Email
              <input
                type="email"
                autoComplete="email"
                value={formEmail}
                onChange={(e) => setFormEmail(e.target.value)}
                className="mt-1.5 min-h-11 w-full rounded-xl border border-zinc-700 bg-zinc-800 px-3.5 text-white focus:border-red-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
              />
            </label>
            <label className="block text-sm font-medium text-zinc-300">
              Password
              <input
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1.5 min-h-11 w-full rounded-xl border border-zinc-700 bg-zinc-800 px-3.5 text-white focus:border-red-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
              />
            </label>
            {error && (
              <p role="alert" className="rounded-lg border border-red-900/60 bg-red-950/40 p-2.5 text-sm text-red-300">
                {error}
              </p>
            )}
            <button
              type="submit"
              disabled={busy}
              className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-red-600 text-sm font-semibold hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {busy && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
              {busy ? 'Memproses…' : 'Masuk'}
            </button>
          </form>
        )}
      </dialog>
    </>
  );
}
