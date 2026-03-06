'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { api } from '../../../lib/api';
import { sanitizeRedirect } from '../../../lib/sanitize-redirect';
import { useAuthStore } from '../../../store/auth';
import { SplineScene } from '../../../components/ui/splite';

function VerifyEmailPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const setAuth = useAuthStore((s) => s.setAuth);
  const emailFromQuery = searchParams.get('email') || '';
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  useEffect(() => {
    if (!emailFromQuery) {
      router.replace('/auth/register');
    }
  }, [emailFromQuery, router]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setInfo('');
    const codeDigits = code.replace(/\D/g, '').slice(0, 6);
    if (codeDigits.length !== 6) {
      setError('Введите 6-значный код');
      return;
    }
    setLoading(true);
    try {
      const res = await api<{
        ok: boolean;
        user?: { id: string; email: string; name: string | null };
        accessToken?: string;
        error?: string;
      }>('/auth/verify-email', {
        method: 'POST',
        body: JSON.stringify({ email: emailFromQuery, code: codeDigits }),
      });
      if (!res.ok) {
        setError(res.error || 'Invalid verification code');
        return;
      }
      if (res.user && res.accessToken) {
        setAuth(res.user, res.accessToken);
        const raw = typeof window !== 'undefined' ? sessionStorage.getItem('auth_redirect') : null;
        const redirectTo = sanitizeRedirect(raw) || '/dashboard';
        if (raw) sessionStorage.removeItem('auth_redirect');
        router.replace(redirectTo);
        return;
      }
      setError('Не удалось подтвердить email');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка запроса');
    } finally {
      setLoading(false);
    }
  };

  const resend = async () => {
    setError('');
    setInfo('');
    setResending(true);
    try {
      const res = await api<{ ok: boolean; error?: string }>('/auth/resend-verification', {
        method: 'POST',
        body: JSON.stringify({ email: emailFromQuery }),
      });
      if (!res.ok) {
        setError(res.error || 'Не удалось отправить код');
        return;
      }
      setInfo('Мы отправили новый код. Проверьте почту (и папку «Спам»).');
      setCode('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка запроса');
    } finally {
      setResending(false);
    }
  };

  if (!emailFromQuery) return null;

  return (
    <main className="relative min-h-screen overflow-hidden bg-slate-950 text-slate-50">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-24 -top-32 h-72 w-72 rounded-full bg-blue-500/20 blur-3xl" />
        <div className="absolute right-10 top-10 h-64 w-64 rounded-full bg-indigo-500/20 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-40 w-40 rounded-full bg-cyan-400/20 blur-3xl" />
        <div
          className="absolute inset-0 opacity-25 mix-blend-soft-light"
          style={{
            backgroundImage:
              'radial-gradient(1px 1px at 10% 20%, rgba(255,255,255,0.08), transparent 50%), radial-gradient(1px 1px at 80% 0%, rgba(255,255,255,0.06), transparent 50%), radial-gradient(1px 1px at 50% 100%, rgba(255,255,255,0.05), transparent 50%)',
          }}
        />
      </div>

      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-8 px-4 py-8 sm:gap-10 sm:py-10 lg:px-10">
        <header className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-500 font-semibold text-white shadow-lg shadow-blue-500/30">
              CX
            </div>
            <div>
              <p className="text-sm uppercase tracking-[0.2em] text-blue-200/80">Connexy</p>
              <h1 className="text-lg font-semibold text-slate-50">Private connections, refined</h1>
            </div>
          </div>
        </header>

        <div className="grid h-full flex-1 items-stretch gap-6 lg:grid-cols-[480px,1fr]">
          <div className="relative order-1 lg:order-2 hidden lg:block">
            <div className="relative h-full min-h-[360px] overflow-hidden rounded-3xl border border-white/5 bg-slate-900/60 shadow-[0_30px_140px_-80px_rgba(0,0,0,1)]">
              <SplineScene
                scene="https://prod.spline.design/kZDDjO5HuC9GJUM2/scene.splinecode"
                className="w-full h-[360px] sm:h-[420px] lg:h-[520px]"
                lockZoom
              />
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-l from-slate-950/70 via-slate-950/20 to-transparent" />
            </div>
          </div>
          <div className="order-2 lg:order-1 rounded-3xl border border-white/5 bg-slate-900/70 p-6 shadow-[0_30px_120px_-60px_rgba(0,0,0,0.9)] backdrop-blur sm:p-8 lg:p-10">
            <div className="space-y-2">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-200">
                ✉️ Подтверждение
              </span>
              <h2 className="text-3xl font-semibold leading-tight text-white">Confirm your email</h2>
              <p className="text-sm text-slate-400">
                Enter the 6-digit code sent to your email.
              </p>
              {emailFromQuery && (
                <p className="text-xs text-slate-500 truncate">Sent to: {emailFromQuery}</p>
              )}
            </div>

            <form onSubmit={submit} className="mt-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm text-slate-200">Verification code</label>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  autoComplete="one-time-code"
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white text-center text-2xl tracking-[0.5em] placeholder:text-slate-500 outline-none ring-0 transition focus:border-blue-400 focus:bg-white/10 focus:ring-2 focus:ring-blue-500/40"
                />
              </div>
              {info && <p className="text-sm text-green-300">{info}</p>}
              {error && <p className="text-sm text-red-400">{error}</p>}
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-500/30 transition hover:translate-y-[-1px] hover:shadow-xl hover:shadow-blue-500/40 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {loading ? 'Проверяем...' : 'Verify'}
              </button>
            </form>

            <p className="mt-6 text-sm text-slate-400">
              Не пришёл код?{' '}
              <button
                type="button"
                onClick={resend}
                disabled={resending}
                className="text-blue-200 underline hover:text-white disabled:opacity-60"
              >
                {resending ? 'Отправляем…' : 'Отправить ещё раз'}
              </button>{' '}
              или{' '}
              <Link className="text-blue-200 underline hover:text-white" href="/auth/register">
                зарегистрируйтесь снова
              </Link>
              .
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={null}>
      <VerifyEmailPageInner />
    </Suspense>
  );
}
