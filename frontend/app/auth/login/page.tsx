'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { api } from '../../../lib/api';
import { useAuthStore } from '../../../store/auth';
import { SplineScene } from '../../../components/ui/splite';

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const redirect = searchParams.get('redirect');
    if (redirect && typeof window !== 'undefined') sessionStorage.setItem('auth_redirect', redirect);
  }, [searchParams]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
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
      const redirect = typeof window !== 'undefined' ? sessionStorage.getItem('auth_redirect') : null;
      if (redirect) sessionStorage.removeItem('auth_redirect');
      router.replace(redirect || '/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка запроса');
    }
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-slate-950 text-slate-50">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-24 -top-32 h-72 w-72 rounded-full bg-blue-500/20 blur-3xl" />
        <div className="absolute right-10 top-10 h-64 w-64 rounded-full bg-indigo-500/20 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-40 w-40 rounded-full bg-cyan-400/20 blur-3xl" />
      </div>

      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-10 px-4 py-10 lg:px-10">
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

        <div className="grid h-full flex-1 items-stretch gap-8 lg:grid-cols-[480px,1fr]">
          <div className="rounded-3xl border border-white/5 bg-slate-900/70 p-8 shadow-[0_30px_120px_-60px_rgba(0,0,0,0.9)] backdrop-blur lg:p-10">
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
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder:text-slate-500 outline-none ring-0 transition focus:border-blue-400 focus:bg-white/10 focus:ring-2 focus:ring-blue-500/40"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-sm text-slate-200">
                  <label>Пароль</label>
                  <span className="text-slate-500">Забыли пароль?</span>
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder:text-slate-500 outline-none ring-0 transition focus:border-blue-400 focus:bg-white/10 focus:ring-2 focus:ring-blue-500/40"
                  required
                />
              </div>
              {error && <p className="text-sm text-red-400">{error}</p>}
              <button
                type="submit"
                className="w-full rounded-xl bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-500/30 transition hover:translate-y-[-1px] hover:shadow-xl hover:shadow-blue-500/40 active:translate-y-0"
              >
                Войти в аккаунт
              </button>
            </form>

            <div className="mt-5 flex items-center justify-between gap-3 text-xs text-slate-400">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-green-400" />
                <span>Сеансы зашифрованы</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-blue-400" />
                <span>24/7 доступ</span>
              </div>
            </div>

            <p className="mt-6 text-sm text-slate-400">
              Нет аккаунта?{' '}
              <Link className="text-blue-200 underline decoration-blue-500/60 underline-offset-4 hover:text-white" href="/auth/register">
                Зарегистрируйтесь
              </Link>
            </p>
          </div>

          <div className="relative flex h-full min-h-[560px] flex-col justify-between gap-6">
            <div className="relative h-full overflow-hidden rounded-3xl border border-white/5 bg-slate-900/60 shadow-[0_30px_140px_-80px_rgba(0,0,0,1)]">
              <SplineScene
                scene="https://prod.spline.design/kZDDjO5HuC9GJUM2/scene.splinecode"
                className="h-full min-h-[520px] w-full"
              />
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-l from-slate-950/70 via-slate-950/20 to-transparent" />
              <div className="absolute left-6 bottom-6 flex flex-col gap-2 rounded-2xl border border-white/10 bg-black/50 px-4 py-3 backdrop-blur">
                <p className="text-xs uppercase tracking-[0.2em] text-blue-200">Realtime</p>
                <p className="text-lg font-semibold text-white">Личные связи без шума</p>
                <p className="text-sm text-slate-400">Приглашения по токену, быстрые ответы и медиа.</p>
              </div>
            </div>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {[
                { title: 'Приглашения по ссылке', desc: 'Токен на 7 дней с автоматическим контролем' },
                { title: 'Файлы и медиа', desc: 'Загрузка и предпросмотр прямо в чате' },
                { title: 'SQLite → Postgres', desc: 'Готово к апгрейду без миграций руками' },
                { title: 'UI без отвлечений', desc: 'Чистая темная тема и быстрый поиск' },
              ].map((item) => (
                <div key={item.title} className="rounded-xl border border-white/5 bg-white/5 px-4 py-3">
                  <p className="text-sm font-semibold text-white">{item.title}</p>
                  <p className="text-xs text-slate-400">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
