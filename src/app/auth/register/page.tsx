'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/providers/AuthProvider';
import { Button } from '@/components/common/Button';
import Link from 'next/link';
import { Loader2, Eye, EyeOff, ArrowLeft, Mail, KeyRound, Gift, ShieldCheck } from 'lucide-react';

export default function RegisterPage() {
  const { register, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  // Step state: 1 = Email, 2 = Verify Code, 3 = Password & Invite
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [inviteCode, setInviteCode] = useState('');

  // Visibility toggles
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Status & error handling
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  
  // Timer for code resend
  const [resendCountdown, setResendCountdown] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      router.replace('/');
    }
  }, [isAuthenticated, isLoading, router]);

  // Handle resend timer countdown
  useEffect(() => {
    if (resendCountdown > 0) {
      timerRef.current = setTimeout(() => {
        setResendCountdown((prev) => prev - 1);
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [resendCountdown]);

  if (isLoading) {
    return (
      <div className="h-screen bg-black flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-10 h-10 text-red-600 animate-spin" />
          <p className="text-zinc-500 text-sm">Memuat...</p>
        </div>
      </div>
    );
  }

  if (isAuthenticated) {
    return null;
  }

  // Step 1: Check Email & Send Code
  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setError(null);
    setSubmitting(true);

    try {
      // 1. Check account availability
      const checkRes = await fetch('/api/auth/check-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const checkJson = await checkRes.json();

      if (!checkRes.ok || !checkJson.success) {
        throw new Error(checkJson.error || 'Terjadi kesalahan saat memeriksa email.');
      }

      if (checkJson.data.exists) {
        throw new Error('Email sudah terdaftar. Silakan login.');
      }

      // 2. Send SMS/verification code
      const sendRes = await fetch('/api/auth/send-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, type: 1 }), // type: 1 represents registration
      });
      const sendJson = await sendRes.json();

      if (!sendRes.ok || !sendJson.success) {
        throw new Error(sendJson.error || 'Gagal mengirim kode verifikasi.');
      }

      // Proceed to Step 2
      setStep(2);
      setResendCountdown(60); // Start 60s countdown
    } catch (err: any) {
      setError(err.message || 'Gagal memproses email.');
    } finally {
      setSubmitting(false);
    }
  };

  // Resend code request
  const handleResendCode = async () => {
    if (resendCountdown > 0 || submitting) return;
    setError(null);
    setSubmitting(true);

    try {
      const res = await fetch('/api/auth/send-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, type: 1 }),
      });
      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Gagal mengirim ulang kode.');
      }

      setResendCountdown(60);
    } catch (err: any) {
      setError(err.message || 'Gagal mengirim ulang kode.');
    } finally {
      setSubmitting(false);
    }
  };

  // Step 2: Verify code
  const handleCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code || code.length !== 6) {
      setError('Kode verifikasi harus 6 digit.');
      return;
    }

    setError(null);
    setSubmitting(true);

    try {
      const res = await fetch('/api/auth/verify-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code }),
      });
      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Kode verifikasi tidak valid.');
      }

      // Proceed to Step 3
      setStep(3);
    } catch (err: any) {
      setError(err.message || 'Gagal memverifikasi kode.');
    } finally {
      setSubmitting(false);
    }
  };

  // Step 3: Set Password & referral, complete registration
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) {
      setError('Password wajib diisi.');
      return;
    }
    if (password.length < 6 || password.length > 18) {
      setError('Password harus berukuran 6 - 18 karakter.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Password konfirmasi tidak cocok.');
      return;
    }

    setError(null);
    setSubmitting(true);

    try {
      await register(email, password, code, inviteCode);
    } catch (err: any) {
      setError(err.message || 'Gagal menyelesaikan pendaftaran.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-black overflow-hidden font-sans text-white px-4">
      {/* Background glow effects */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-red-950/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-red-900/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Main Container */}
      <div className="w-full max-w-md z-10 my-8">
        {/* Back Button & Logo */}
        <div className="flex items-center justify-between mb-8">
          {step > 1 ? (
            <button
              onClick={() => {
                setError(null);
                setStep((prev) => prev - 1);
              }}
              className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white transition-colors py-2"
              disabled={submitting}
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Kembali</span>
            </button>
          ) : (
            <Link
              href="/auth/login"
              className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white transition-colors py-2"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Ke Halaman Login</span>
            </Link>
          )}

          <Link href="/">
            <h1 className="text-2xl font-extrabold tracking-tight text-red-600 drop-shadow-[0_0_10px_rgba(220,38,38,0.3)] hover:text-red-500 transition-colors duration-300">
              NobarFilm
            </h1>
          </Link>
        </div>

        {/* Progress indicator */}
        <div className="flex items-center justify-between px-2 mb-6">
          <div className="flex items-center gap-2">
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${step >= 1 ? 'bg-red-600 text-white' : 'bg-zinc-800 text-zinc-500'}`}>1</span>
            <span className={`text-xs ${step === 1 ? 'text-white font-medium' : 'text-zinc-500'}`}>Email</span>
          </div>
          <div className="flex-1 h-[2px] mx-3 bg-zinc-800 relative">
            <div className={`absolute left-0 top-0 h-full bg-red-600 transition-all duration-300 ${step >= 2 ? 'w-full' : 'w-0'}`} />
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${step >= 2 ? 'bg-red-600 text-white' : 'bg-zinc-800 text-zinc-500'}`}>2</span>
            <span className={`text-xs ${step === 2 ? 'text-white font-medium' : 'text-zinc-500'}`}>Verifikasi</span>
          </div>
          <div className="flex-1 h-[2px] mx-3 bg-zinc-800 relative">
            <div className={`absolute left-0 top-0 h-full bg-red-600 transition-all duration-300 ${step >= 3 ? 'w-full' : 'w-0'}`} />
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${step >= 3 ? 'bg-red-600 text-white' : 'bg-zinc-800 text-zinc-500'}`}>3</span>
            <span className={`text-xs ${step === 3 ? 'text-white font-medium' : 'text-zinc-500'}`}>Selesai</span>
          </div>
        </div>

        {/* Card */}
        <div className="bg-zinc-950/40 backdrop-blur-md border border-zinc-800/80 rounded-2xl p-8 shadow-2xl">
          <div className="mb-6">
            <h2 className="text-xl font-bold">
              {step === 1 && 'Daftar Akun MovieBox'}
              {step === 2 && 'Masukkan Kode Verifikasi'}
              {step === 3 && 'Buat Password Anda'}
            </h2>
            <p className="text-xs text-zinc-400 mt-1.5">
              {step === 1 && 'Gunakan alamat email aktif untuk menerima kode verifikasi.'}
              {step === 2 && `Kode verifikasi 6 digit telah dikirim ke email: ${email}`}
              {step === 3 && 'Langkah terakhir untuk menyelesaikan pembuatan akun Anda.'}
            </p>
          </div>

          {error && (
            <div className="mb-6 bg-red-950/50 border border-red-500/30 text-red-200 text-sm rounded-lg p-3">
              {error}
            </div>
          )}

          {/* STEP 1 FORM: Email */}
          {step === 1 && (
            <form onSubmit={handleEmailSubmit} className="space-y-6">
              <div>
                <label htmlFor="email" className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-2">
                  Alamat Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-4 top-3.5 h-5 w-5 text-zinc-500" />
                  <input
                    id="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="nama@email.com"
                    className="w-full bg-zinc-900/50 border border-zinc-800 hover:border-zinc-700 focus:border-red-500/50 rounded-xl py-3 pl-12 pr-4 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-red-500/50 transition-all"
                    disabled={submitting}
                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={submitting || !email}
                className="w-full bg-red-600 hover:bg-red-700 hover:shadow-[0_0_15px_rgba(220,38,38,0.4)] text-white py-3 rounded-xl font-semibold transition-all duration-300 transform active:scale-[0.98]"
              >
                {submitting ? (
                  <div className="flex items-center justify-center gap-2">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Memproses...</span>
                  </div>
                ) : (
                  'Kirim Kode Verifikasi'
                )}
              </Button>
            </form>
          )}

          {/* STEP 2 FORM: Verify Code */}
          {step === 2 && (
            <form onSubmit={handleCodeSubmit} className="space-y-6">
              <div>
                <label htmlFor="code" className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-2">
                  Kode Verifikasi (6 Digit)
                </label>
                <div className="relative">
                  <ShieldCheck className="absolute left-4 top-3.5 h-5 w-5 text-zinc-500" />
                  <input
                    id="code"
                    type="text"
                    required
                    maxLength={6}
                    pattern="[0-9]*"
                    inputMode="numeric"
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/[^0-9]/g, ''))}
                    placeholder="000000"
                    className="w-full bg-zinc-900/50 border border-zinc-800 hover:border-zinc-700 focus:border-red-500/50 rounded-xl py-3 pl-12 pr-4 text-base tracking-[0.5em] text-center text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-red-500/50 transition-all font-mono"
                    disabled={submitting}
                  />
                </div>
              </div>

              {/* Countdown or Resend link */}
              <div className="text-center text-xs">
                {resendCountdown > 0 ? (
                  <span className="text-zinc-500">
                    Kirim ulang kode dalam <strong className="text-zinc-300 font-semibold">{resendCountdown}s</strong>
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={handleResendCode}
                    disabled={submitting}
                    className="text-red-500 hover:text-red-400 transition-colors font-medium"
                  >
                    Kirim Ulang Kode Verifikasi
                  </button>
                )}
              </div>

              <Button
                type="submit"
                disabled={submitting || code.length !== 6}
                className="w-full bg-red-600 hover:bg-red-700 hover:shadow-[0_0_15px_rgba(220,38,38,0.4)] text-white py-3 rounded-xl font-semibold transition-all duration-300 transform active:scale-[0.98]"
              >
                {submitting ? (
                  <div className="flex items-center justify-center gap-2">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Verifikasi...</span>
                  </div>
                ) : (
                  'Verifikasi Kode'
                )}
              </Button>
            </form>
          )}

          {/* STEP 3 FORM: Password & Invite Code */}
          {step === 3 && (
            <form onSubmit={handleRegisterSubmit} className="space-y-6">
              {/* Password */}
              <div>
                <label htmlFor="password" className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-2">
                  Password Baru (6-18 Karakter)
                </label>
                <div className="relative">
                  <KeyRound className="absolute left-4 top-3.5 h-5 w-5 text-zinc-500" />
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Password baru"
                    className="w-full bg-zinc-900/50 border border-zinc-800 hover:border-zinc-700 focus:border-red-500/50 rounded-xl py-3 pl-12 pr-12 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-red-500/50 transition-all"
                    disabled={submitting}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-3.5 text-zinc-500 hover:text-white transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div>
                <label htmlFor="confirmPassword" className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-2">
                  Konfirmasi Password
                </label>
                <div className="relative">
                  <KeyRound className="absolute left-4 top-3.5 h-5 w-5 text-zinc-500" />
                  <input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Konfirmasi password baru"
                    className="w-full bg-zinc-900/50 border border-zinc-800 hover:border-zinc-700 focus:border-red-500/50 rounded-xl py-3 pl-12 pr-12 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-red-500/50 transition-all"
                    disabled={submitting}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-4 top-3.5 text-zinc-500 hover:text-white transition-colors"
                  >
                    {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              {/* Referral/Invite Code */}
              <div>
                <label htmlFor="inviteCode" className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-2">
                  Kode Rujukan / Undangan (Opsional)
                </label>
                <div className="relative">
                  <Gift className="absolute left-4 top-3.5 h-5 w-5 text-zinc-500" />
                  <input
                    id="inviteCode"
                    type="text"
                    value={inviteCode}
                    onChange={(e) => setInviteCode(e.target.value)}
                    placeholder="Masukkan kode undangan"
                    className="w-full bg-zinc-900/50 border border-zinc-800 hover:border-zinc-700 focus:border-red-500/50 rounded-xl py-3 pl-12 pr-4 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-red-500/50 transition-all"
                    disabled={submitting}
                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={submitting || !password || password !== confirmPassword}
                className="w-full bg-red-600 hover:bg-red-700 hover:shadow-[0_0_15px_rgba(220,38,38,0.4)] text-white py-3 rounded-xl font-semibold transition-all duration-300 transform active:scale-[0.98]"
              >
                {submitting ? (
                  <div className="flex items-center justify-center gap-2">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Membuat Akun...</span>
                  </div>
                ) : (
                  'Selesaikan Pendaftaran'
                )}
              </Button>
            </form>
          )}
        </div>

        {/* Footer info */}
        <div className="mt-8 text-center text-xs text-zinc-500">
          <p>Dengan mendaftar, Anda menyetujui Ketentuan Layanan & Kebijakan Privasi MovieBox.</p>
        </div>
      </div>
    </div>
  );
}
