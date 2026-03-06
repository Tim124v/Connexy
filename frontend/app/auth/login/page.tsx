'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { api } from '../../../lib/api';
import { sanitizeRedirect } from '../../../lib/sanitize-redirect';
import { useAuthStore } from '../../../store/auth';
import { SplineScene } from '../../../components/ui/splite';

function LoginPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const raw = searchParams.get('redirect');
    const safe = sanitizeRedirect(raw);
    if (safe && typeof window !== 'undefined') sessionStorage.setItem('auth_redirect', safe);
  }, [searchParams]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await api<{ ok: boolean; user?: { id: string; email: string; name: string | null }; accessToken?: string; error?: string }>(
        '/auth/login',
        { method: 'POST', body: JSON.stringify({ email: email.trim(), password }) },
      );
      if (!res.ok || !res.user || !res.accessToken) {
        setError(res.error || 'Неверный email или пароль');
        return;
      }
      setAuth(res.user, res.accessToken);
      const raw = typeof window !== 'undefined' ? sessionStorage.getItem('auth_redirect') : null;
      const redirect = sanitizeRedirect(raw);
      if (raw) sessionStorage.removeItem('auth_redirect');
      router.replace(redirect || '/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка запроса');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Suspense fallback={null}>
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
          <div className="hidden text-sm text-slate-300 md:flex items-center gap-3">
            <span className="rounded-full bg-green-500/15 px-3 py-1 text-green-200">Online</span>
            <span className="text-slate-400">Secure by design</span>
          </div>
        </header>

        <div className="grid h-full flex-1 items-stretch gap-6 lg:grid-cols-[480px,1fr]">
          <div className="relative flex h-full min-h-[360px] flex-col gap-6 order-1 lg:order-2">
            <div className="relative h-full overflow-hidden rounded-3xl border border-white/5 bg-slate-900/60 shadow-[0_30px_140px_-80px_rgba(0,0,0,1)]">
              <SplineScene
                scene="https://prod.spline.design/kZDDjO5HuC9GJUM2/scene.splinecode"
                className="w-full h-[360px] sm:h-[420px] lg:h-[520px]"
                lockZoom
              />
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-l from-slate-950/70 via-slate-950/20 to-transparent" />
              <div className="absolute left-6 bottom-6 flex flex-col gap-2 rounded-2xl border border-white/10 bg-black/50 px-4 py-3 backdrop-blur">
                <p className="text-xs uppercase tracking-[0.2em] text-blue-200">Realtime</p>
                <p className="text-lg font-semibold text-white">Личные связи без шума</p>
                <p className="text-sm text-slate-400">Приглашайте по ссылке или email — общайтесь только с теми, кого добавили.</p>
              </div>
            </div>
            <div className="hidden gap-3 sm:grid sm:grid-cols-2">
              {[
                { title: 'Приглашения по ссылке', desc: 'Вы решаете, кто в вашем круге. Одна ссылка — и человек рядом.' },
                { title: 'Файлы и медиа', desc: 'Картинки и файлы прямо в чате, без лишних сервисов.' },
                { title: 'Только ваши люди', desc: 'Никаких случайных контактов. Только те, кому вы доверяете.' },
                { title: 'Без лишнего шума', desc: 'Чистый интерфейс и быстрый поиск. Сфокусируйтесь на общении.' },
              ].map((item) => (
                <div key={item.title} className="rounded-xl border border-white/5 bg-white/5 px-4 py-3">
                  <p className="text-sm font-semibold text-white">{item.title}</p>
                  <p className="text-xs text-slate-400">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="order-2 lg:order-1 rounded-3xl border border-white/5 bg-slate-900/70 p-6 shadow-[0_30px_120px_-60px_rgba(0,0,0,0.9)] backdrop-blur sm:p-8 lg:p-10">
            <div className="space-y-2">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-200">
                🔒 End-to-end mindset
              </span>
              <h2 className="text-3xl font-semibold leading-tight text-white">Войдите, чтобы продолжить</h2>
              <p className="text-sm text-slate-400">
                Доступ к контактам, приглашениям и защищённым чатам в один клик.
              </p>
            </div>

            <form onSubmit={submit} className="mt-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm text-slate-200">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  autoComplete="email"
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder:text-slate-500 outline-none ring-0 transition focus:border-blue-400 focus:bg-white/10 focus:ring-2 focus:ring-blue-500/40"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-sm text-slate-200">
                  <label>Пароль</label>
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="text-slate-500 transition hover:text-slate-200"
                  >
                    {showPassword ? 'Скрыть' : 'Показать'}
                  </button>
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder:text-slate-500 outline-none ring-0 transition focus:border-blue-400 focus:bg-white/10 focus:ring-2 focus:ring-blue-500/40"
                  required
                />
              </div>
              <label className="flex items-center gap-2 text-sm text-slate-300">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  className="h-4 w-4 rounded border-white/20 bg-white/5 accent-blue-500"
                />
                Запомнить меня
              </label>
              {error && <p className="text-sm text-red-400">{error}</p>}
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-500/30 transition hover:translate-y-[-1px] hover:shadow-xl hover:shadow-blue-500/40 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {loading ? 'Входим...' : 'Войти в аккаунт'}
              </button>
            </form>

            <div className="mt-5 flex flex-wrap items-center gap-3 text-xs text-slate-300">
              <span className="inline-flex items-center gap-2 rounded-full bg-green-500/15 px-3 py-1 text-green-200">
                <span className="h-2 w-2 rounded-full bg-green-300" />
                Сеансы зашифрованы (JWT + HTTPS)
              </span>
              <span className="inline-flex items-center gap-2 rounded-full bg-blue-500/15 px-3 py-1 text-blue-200">
                <span className="h-2 w-2 rounded-full bg-blue-300" />
                24/7 доступ
              </span>
              <span className="inline-flex items-center gap-2 rounded-full bg-slate-500/10 px-3 py-1 text-slate-200">
                <span className="h-2 w-2 rounded-full bg-slate-200" />
                MFA / токены приглашений
              </span>
            </div>

            <p className="mt-6 text-sm text-slate-400">
              Нет аккаунта?{' '}
              <Link
                className="text-blue-200 underline decoration-blue-500/60 underline-offset-4 hover:text-white"
                href={(() => {
                  const safe = sanitizeRedirect(searchParams.get('redirect'));
                  return safe ? `/auth/register?redirect=${encodeURIComponent(safe)}` : '/auth/register';
                })()}
              >
                Зарегистрируйтесь
              </Link>
            </p>
          </div>

        </div>
      </div>
    </main>
    </Suspense>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginPageInner />
    </Suspense>
  );
}
