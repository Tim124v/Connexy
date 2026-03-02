'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '../../store/auth';
import { api } from '../../lib/api';
import { useTheme } from '../../components/theme-provider';

const initials = (name?: string | null, email?: string) => {
  if (name && name.trim()) {
    return name
      .trim()
      .split(/\s+/)
      .map((part) => part[0]?.toUpperCase())
      .slice(0, 2)
      .join('');
  }
  if (email) return email[0]?.toUpperCase() || '?';
  return '?';
};

export default function ProfilePage() {
  const router = useRouter();
  const { user, accessToken, setAuth, logout } = useAuthStore();
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const { theme, toggle } = useTheme();

  useEffect(() => {
    if (typeof window === 'undefined' || !accessToken) {
      if (!accessToken) router.replace('/auth');
      return;
    }
    api<{ name: string | null }>('/users/me')
      .then((data) => setName(data.name ?? ''))
      .catch(() => router.replace('/auth'));
  }, [accessToken, router]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessToken) return;
    setSaving(true);
    try {
      const updated = await api<{ id: string; email: string; name: string | null }>('/users/me', {
        method: 'PATCH',
        body: JSON.stringify({ name: name.trim() || null }),
      });
      setAuth(updated, accessToken);
    } finally {
      setSaving(false);
    }
  };

  const avatarText = useMemo(() => initials(user?.name, user?.email), [user]);

  if (!user) return null;

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 dark:from-slate-900 dark:via-slate-900 dark:to-slate-950">
      <div className="container mx-auto max-w-4xl px-4 py-10 space-y-6">
        <header className="flex items-center gap-3 text-sm text-gray-600 dark:text-slate-300">
          <Link href="/" className="hover:text-blue-600 dark:hover:text-blue-400 transition">← Чаты</Link>
          <span>Профиль</span>
        </header>

        <div className="grid md:grid-cols-[320px,1fr] gap-6">
          <div className="rounded-2xl border bg-white/90 dark:bg-slate-800/80 dark:border-slate-700 backdrop-blur shadow-lg p-6 space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-200 flex items-center justify-center text-2xl font-semibold">
                {avatarText}
              </div>
              <div className="space-y-1">
                <div className="text-lg font-semibold text-gray-900 dark:text-slate-50">{user.name || 'Без имени'}</div>
                <div className="text-sm text-gray-500 dark:text-slate-300">{user.email}</div>
              </div>
            </div>
            <div className="pt-2">
              <button
                onClick={() => logout()}
                className="text-sm text-red-500 hover:text-red-600 font-medium"
              >
                Выйти из аккаунта
              </button>
            </div>
            <div className="text-sm text-gray-500 dark:text-slate-300">
              Здесь вы можете обновить отображаемое имя и посмотреть данные аккаунта.
            </div>
            <div className="flex items-center justify-between text-sm text-gray-700 dark:text-slate-200">
              <span>Тема</span>
              <button
                onClick={toggle}
                className="px-3 py-1 rounded-full border bg-gray-100 dark:bg-slate-700 dark:border-slate-600 hover:bg-gray-200 dark:hover:bg-slate-600 transition"
              >
                {theme === 'dark' ? 'Dark' : 'Light'}
              </button>
            </div>
          </div>

          <div className="rounded-2xl border bg-white/90 dark:bg-slate-800/80 dark:border-slate-700 backdrop-blur shadow-lg p-6 space-y-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-50">Настройки профиля</h2>
            <form onSubmit={save} className="space-y-3">
              <div className="space-y-1">
                <label className="block text-sm text-gray-700 dark:text-slate-300">Имя (отображаемое)</label>
                <input
                  className="w-full border rounded-lg px-3 py-2 bg-gray-50 dark:bg-slate-700 dark:border-slate-600 dark:text-slate-50 focus:bg-white dark:focus:bg-slate-600 focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-500 focus:outline-none"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Имя"
                />
              </div>
              <div className="text-xs text-gray-500 dark:text-slate-300">Это имя увидят другие пользователи в чатах и контактах.</div>
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 rounded-lg bg-blue-600 text-white disabled:opacity-50 hover:bg-blue-700 transition dark:bg-blue-500 dark:hover:bg-blue-400"
              >
                {saving ? 'Сохранение...' : 'Сохранить'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </main>
  );
}
