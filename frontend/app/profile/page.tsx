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
  const [rooms, setRooms] = useState<
    { id: string; name: string; owner: { id: string; email: string; name: string | null }; isOwner: boolean }[]
  >([]);
  const [roomName, setRoomName] = useState('');
  const [roomPass, setRoomPass] = useState('');
  const [joinId, setJoinId] = useState('');
  const [joinPass, setJoinPass] = useState('');
  const [roomMsg, setRoomMsg] = useState('');

  useEffect(() => {
    if (typeof window === 'undefined' || !accessToken) {
      if (!accessToken) router.replace('/');
      return;
    }
    api<{ name: string | null }>('/users/me')
      .then((data) => setName(data.name ?? ''))
      .catch(() => router.replace('/'));
    api<
      { id: string; name: string; owner: { id: string; email: string; name: string | null }; isOwner: boolean }[]
    >('/rooms')
      .then(setRooms)
      .catch(() => setRooms([]));
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

  const createRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    setRoomMsg('');
    try {
      await api('/rooms', {
        method: 'POST',
        body: JSON.stringify({ name: roomName.trim() || 'Комната', password: roomPass }),
      });
      setRoomName('');
      setRoomPass('');
      const list = await api<
        { id: string; name: string; owner: { id: string; email: string; name: string | null }; isOwner: boolean }[]
      >('/rooms');
      setRooms(list);
      setRoomMsg('Комната создана. Скопируйте ее ID для приглашения.');
    } catch (err) {
      setRoomMsg(err instanceof Error ? err.message : 'Не удалось создать комнату');
    }
  };

  const joinRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    setRoomMsg('');
    const id = joinId.trim();
    if (!id) return;
    try {
      await api('/rooms/join', { method: 'POST', body: JSON.stringify({ roomId: id, password: joinPass }) });
      setJoinId('');
      setJoinPass('');
      const list = await api<
        { id: string; name: string; owner: { id: string; email: string; name: string | null }; isOwner: boolean }[]
      >('/rooms');
      setRooms(list);
      setRoomMsg('Вы присоединились к комнате.');
    } catch (err) {
      setRoomMsg(err instanceof Error ? err.message : 'Не удалось присоединиться');
    }
  };

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

          <div className="rounded-2xl border bg-white/90 dark:bg-slate-800/80 dark:border-slate-700 backdrop-blur shadow-lg p-6 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-50">Комнаты с паролем</h2>
              <span className="text-xs text-slate-500 dark:text-slate-300">Создайте или подключитесь по коду</span>
            </div>
            <form onSubmit={createRoom} className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1 sm:col-span-1">
                <label className="block text-sm text-gray-700 dark:text-slate-300">Название</label>
                <input
                  className="w-full border rounded-lg px-3 py-2 bg-gray-50 dark:bg-slate-700 dark:border-slate-600 dark:text-slate-50 focus:bg-white dark:focus:bg-slate-600 focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-500 focus:outline-none"
                  value={roomName}
                  onChange={(e) => setRoomName(e.target.value)}
                  placeholder="Например: Проект А"
                />
              </div>
              <div className="space-y-1 sm:col-span-1">
                <label className="block text-sm text-gray-700 dark:text-slate-300">Пароль комнаты</label>
                <input
                  className="w-full border rounded-lg px-3 py-2 bg-gray-50 dark:bg-slate-700 dark:border-slate-600 dark:text-slate-50 focus:bg-white dark:focus:bg-slate-600 focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-500 focus:outline-none"
                  value={roomPass}
                  onChange={(e) => setRoomPass(e.target.value)}
                  placeholder="Придумайте пароль"
                  required
                />
              </div>
              <div className="sm:col-span-2">
                <button
                  type="submit"
                  className="w-full sm:w-auto px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition dark:bg-indigo-500 dark:hover:bg-indigo-400"
                >
                  Создать комнату
                </button>
              </div>
            </form>

            <form onSubmit={joinRoom} className="grid gap-3 sm:grid-cols-2 border-t border-slate-200 dark:border-slate-700 pt-4">
              <div className="space-y-1 sm:col-span-1">
                <label className="block text-sm text-gray-700 dark:text-slate-300">ID комнаты</label>
                <input
                  className="w-full border rounded-lg px-3 py-2 bg-gray-50 dark:bg-slate-700 dark:border-slate-600 dark:text-slate-50 focus:bg-white dark:focus:bg-slate-600 focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-500 focus:outline-none"
                  value={joinId}
                  onChange={(e) => setJoinId(e.target.value)}
                  placeholder="Вставьте ID"
                  required
                />
              </div>
              <div className="space-y-1 sm:col-span-1">
                <label className="block text-sm text-gray-700 dark:text-slate-300">Пароль комнаты</label>
                <input
                  className="w-full border rounded-lg px-3 py-2 bg-gray-50 dark:bg-slate-700 dark:border-slate-600 dark:text-slate-50 focus:bg-white dark:focus:bg-slate-600 focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-500 focus:outline-none"
                  value={joinPass}
                  onChange={(e) => setJoinPass(e.target.value)}
                  placeholder="Пароль"
                  required
                />
              </div>
              <div className="sm:col-span-2">
                <button
                  type="submit"
                  className="w-full sm:w-auto px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-600 text-slate-800 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
                >
                  Присоединиться
                </button>
              </div>
            </form>

            {roomMsg && <div className="text-sm text-slate-600 dark:text-slate-200">{roomMsg}</div>}

            <div className="space-y-2">
              <div className="text-sm font-semibold text-slate-800 dark:text-slate-100">Мои комнаты</div>
              {rooms.length === 0 && <div className="text-sm text-slate-500 dark:text-slate-300">Пока нет комнат.</div>}
              {rooms.map((r) => (
                <div
                  key={r.id}
                  className="flex items-center justify-between rounded-lg border border-slate-200 dark:border-slate-600 px-3 py-2 text-sm text-slate-800 dark:text-slate-100"
                >
                  <div className="min-w-0">
                    <div className="font-semibold truncate">{r.name}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 truncate">{r.id}</div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">
                      {r.isOwner ? 'Вы владелец' : `Владелец: ${r.owner.name || r.owner.email}`}
                    </div>
                  </div>
                  <button
                    type="button"
                    className="ml-2 shrink-0 rounded-full border border-slate-200 dark:border-slate-500 px-3 py-1 text-xs hover:bg-slate-100 dark:hover:bg-slate-700 transition"
                    onClick={() => navigator.clipboard?.writeText(r.id)}
                  >
                    Копировать ID
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
