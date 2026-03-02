'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { api } from '../../../lib/api';
import { useAuthStore } from '../../../store/auth';
import { SplineScene } from '../../../components/ui/splite';

export default function RegisterPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
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
        '/auth/register',
        { method: 'POST', body: JSON.stringify({ email: email.trim(), password, name }) },
      );
      if (!res.ok || !res.user || !res.accessToken) {
        setError(res.error || 'Не удалось зарегистрироваться');
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
    <main className="min-h-screen bg-black dark:bg-slate-950 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-6xl bg-gradient-to-br from-gray-900 to-black rounded-3xl shadow-2xl border border-gray-800 overflow-hidden grid md:grid-cols-[420px,1fr]">
        <div className="bg-black/70 backdrop-blur-sm p-10 flex flex-col justify-center space-y-6">
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold text-white">Sign up</h1>
            <p className="text-sm text-gray-400">Create your account</p>
          </div>

          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-1">
              <label className="text-sm text-gray-300">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full rounded-lg border border-gray-700 bg-gray-900 text-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-500"
                required
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm text-gray-300">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-lg border border-gray-700 bg-gray-900 text-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-500"
                required
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm text-gray-300">Name (optional)</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                className="w-full rounded-lg border border-gray-700 bg-gray-900 text-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-500"
              />
            </div>
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <button
              type="submit"
              className="w-full py-2.5 rounded-lg bg-white text-black font-medium hover:bg-gray-200 transition"
            >
              Sign up
            </button>
          </form>

          <p className="text-sm text-gray-400">
            Уже есть аккаунт?{' '}
            <Link className="text-white underline" href="/auth/login">
              Войти
            </Link>
          </p>
        </div>

        <div className="relative min-h-[520px] bg-black">
          <SplineScene
            scene="https://prod.spline.design/kZDDjO5HuC9GJUM2/scene.splinecode"
            className="w-full h-full"
          />
          <div className="absolute inset-0 bg-gradient-to-l from-black/50 via-black/20 to-transparent pointer-events-none" />
        </div>
      </div>
    </main>
  );
}
