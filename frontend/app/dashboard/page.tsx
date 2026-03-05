'use client';

import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '../../lib/api';
import { useAuthStore } from '../../store/auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

type Connection = { id: string; user: { id: string; email: string; name: string | null } };
type Message = {
  id: string;
  text: string;
  senderId: string;
  recipientId: string;
  createdAt: string;
  attachmentUrl?: string | null;
  attachmentName?: string | null;
  attachmentType?: string | null;
};
type Grouped = { title: string; items: (Message | RoomMessage)[] };
type AttachmentDraft = { type: 'media' | 'file'; name: string; file: File; preview?: string };
type InviteItem = {
  id: string;
  token: string;
  toEmail: string;
  createdAt: string;
  expiresAt: string;
  usedAt: string | null;
  usedById: string | null;
  status: 'active' | 'expired' | 'used';
  link: string;
};
type Room = {
  id: string;
  name: string;
  owner: { id: string; email: string; name: string | null };
  joinedAt: string;
  isOwner: boolean;
  expiresAt?: string;
};
type RoomMessage = { id: string; text: string; senderId: string; createdAt: string; sender: { id: string; email: string; name: string | null } };

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

function DashboardInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, accessToken, logout, hydrated } = useAuthStore();
  const [connections, setConnections] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteLink, setInviteLink] = useState('');
  const [error, setError] = useState('');
  const [invites, setInvites] = useState<InviteItem[]>([]);
  const [selected, setSelected] = useState<Connection | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [roomMessages, setRoomMessages] = useState<RoomMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [loadingRoomMessages, setLoadingRoomMessages] = useState(false);
  const [messageText, setMessageText] = useState('');
  const [showAttach, setShowAttach] = useState(false);
  const [attachment, setAttachment] = useState<AttachmentDraft | null>(null);
  const mediaInputRef = useRef<HTMLInputElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [search, setSearch] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const chatRef = useRef<HTMLDivElement | null>(null);
  const [joinToken, setJoinToken] = useState('');
  const [now, setNow] = useState(() => Date.now());
  const [sendingInvite, setSendingInvite] = useState(false);

  const selectedName = useMemo(
    () => (selectedRoom ? selectedRoom.name : selected?.user.name || selected?.user.email || ''),
    [selected, selectedRoom],
  );
  const filteredConnections = useMemo(() => {
    if (!search.trim()) return connections;
    const q = search.toLowerCase();
    return connections.filter(
      (c) => c.user.email.toLowerCase().includes(q) || (c.user.name || '').toLowerCase().includes(q),
    );
  }, [connections, search]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!hydrated) return;
    if (!accessToken) {
      router.replace('/auth/login');
      return;
    }
    api<Connection[]>('/connections', { method: 'GET' })
      .then(setConnections)
      .catch(() => setConnections([]))
      .finally(() => setLoading(false));
    api<InviteItem[]>('/connections/invites', { method: 'GET' })
      .then(setInvites)
      .catch(() => setInvites([]));
    api<Room[]>('/rooms')
      .then(setRooms)
      .catch(() => setRooms([]));
  }, [accessToken, router, hydrated]);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(id);
  }, []);

  // Если пришли с инвайта с параметром ?select=<id> — выбираем контакт после загрузки списка
  useEffect(() => {
    if (!connections.length) return;
    const selectId = searchParams.get('select');
    if (!selectId) return;
    const found = connections.find((c) => c.user.id === selectId);
    if (found) setSelected(found);
  }, [connections, searchParams]);

  useEffect(() => {
    if (!selected) {
      setMessages([]);
      return;
    }
    setLoadingMessages(true);
    api<Message[]>(`/messages?with=${selected.user.id}`, { method: 'GET' })
      .then(setMessages)
      .catch(() => setMessages([]))
      .finally(() => setLoadingMessages(false));
  }, [selected]);

  useEffect(() => {
    if (!selected) return;
    const id = setInterval(() => {
      api<Message[]>(`/messages?with=${selected.user.id}`, { method: 'GET' }).then(setMessages).catch(() => {});
    }, 3000);
    return () => clearInterval(id);
  }, [selected]);

  useEffect(() => {
    if (!selectedRoom) {
      setRoomMessages([]);
      return;
    }
    setLoadingRoomMessages(true);
    api<RoomMessage[]>(`/rooms/${selectedRoom.id}/messages`, { method: 'GET' })
      .then(setRoomMessages)
      .catch(() => setRoomMessages([]))
      .finally(() => setLoadingRoomMessages(false));
  }, [selectedRoom]);

  useEffect(() => {
    if (!selectedRoom) return;
    const id = setInterval(() => {
      api<RoomMessage[]>(`/rooms/${selectedRoom.id}/messages`, { method: 'GET' }).then(setRoomMessages).catch(() => {});
    }, 3000);
    return () => clearInterval(id);
  }, [selectedRoom]);

  useEffect(() => {
    if (!chatRef.current) return;
    chatRef.current.scrollTo({ top: chatRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, roomMessages]);

  const chatMessages = useMemo(() => (selectedRoom ? roomMessages : messages), [selectedRoom, roomMessages, messages]);
  const isRoomChat = !!selectedRoom;

  const groupedMessages: Grouped[] = useMemo(() => {
    const byDate = new Map<string, (Message | RoomMessage)[]>();
    chatMessages.forEach((m) => {
      const key = new Date(m.createdAt).toDateString();
      if (!byDate.has(key)) byDate.set(key, []);
      byDate.get(key)!.push(m);
    });
    const formatter = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
    return Array.from(byDate.entries())
      .sort((a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime())
      .map(([key, items]) => ({ title: formatter.format(new Date(key)), items }));
  }, [chatMessages]);

  const sendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setInviteLink('');
    const emailToInvite = inviteEmail.trim();
    if (!emailToInvite) return;
    setSendingInvite(true);
    try {
      const res = await api<{ ok: boolean; link?: string; token?: string; error?: string }>('/connections/invite', {
        method: 'POST',
        body: JSON.stringify({ email: emailToInvite }),
      });
      if (!res.ok) {
        setError(res.error || 'Не удалось отправить приглашение');
        return;
      }
      const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
      const link = res.link || (res.token ? `${baseUrl}/invite/${res.token}` : '');
      if (link) {
        setInviteLink(link);
      }
      setInviteEmail('');
      api<InviteItem[]>('/connections/invites', { method: 'GET' })
        .then((list) => {
          setInvites(list);
          if (!link && list.length > 0) {
            const newInvite = list.find((inv) => inv.toEmail === emailToInvite) ?? list[0];
            setInviteLink(newInvite.link);
          }
        })
        .catch(() => {});
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Ошибка запроса';
      if (msg.includes('fetch') || msg.includes('Failed') || msg === 'Ошибка запроса') {
        setError('Сервер не ответил. Подождите 30–60 сек (холодный старт Render) или проверьте интернет. Если вы на проде — в Vercel должен быть NEXT_PUBLIC_API_URL с URL бэкенда на Render.');
      } else {
        setError(msg);
      }
    } finally {
      setSendingInvite(false);
    }
  };

  const joinByToken = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const raw = joinToken.trim();
    if (!raw) return;
    const token = raw.includes('/invite/') ? raw.split('/invite/').pop() || raw : raw;
    try {
      const res = await api<{ ok: boolean; contact?: { id: string; email: string; name: string | null } }>(
        '/connections/accept',
        { method: 'POST', body: JSON.stringify({ token }) },
      );
      if (!res.ok) {
        setError('Не удалось присоединиться по коду');
        return;
      }
      setJoinToken('');
      api<Connection[]>('/connections', { method: 'GET' })
        .then((list) => {
          setConnections(list);
          if (res.contact?.id) {
            const found = list.find((c) => c.user.id === res.contact!.id);
            if (found) setSelected(found);
          }
        })
        .catch(() => {});
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка запроса');
    }
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isRoomChat) {
      if (!selectedRoom || !messageText.trim()) return;
      const text = messageText.trim();
      setMessageText('');
      try {
        const msg = await api<RoomMessage>(`/rooms/${selectedRoom.id}/messages`, {
          method: 'POST',
          body: JSON.stringify({ text }),
        });
        setRoomMessages((prev) => [...prev, msg]);
      } catch {
        // ignore
      }
      return;
    }

    if (!selected || (!messageText.trim() && !attachment)) return;
    const currentAttachment = attachment;
    setMessageText('');
    setShowAttach(false);
    clearAttachment();
    try {
      let uploaded: { url: string; originalName: string; mimeType: string } | null = null;
      if (currentAttachment) {
        const fd = new FormData();
        fd.append('file', currentAttachment.file, currentAttachment.name);
        const token = accessToken || (typeof window !== 'undefined' ? localStorage.getItem('accessToken') || '' : '');
        const res = await fetch(`${API_URL}/messages/upload`, {
          method: 'POST',
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
          body: fd,
        });
        if (!res.ok) throw new Error('Не удалось загрузить файл');
        uploaded = await res.json();
      }

      const msg = await api<Message>('/messages', {
        method: 'POST',
        body: JSON.stringify({
          to: selected.user.id,
          text: messageText.trim(),
          attachment: uploaded ? { url: uploaded.url, name: uploaded.originalName, type: uploaded.mimeType } : undefined,
        }),
      });
      setMessages((prev) => [...prev, msg]);
    } catch {
      if (currentAttachment) setAttachment(currentAttachment);
    }
  };

  const handlePick = (file: File, kind: AttachmentDraft['type']) => {
    const preview = kind === 'media' ? URL.createObjectURL(file) : undefined;
    setAttachment({ type: kind, name: file.name, file, preview });
    setShowAttach(false);
  };

  const clearAttachment = () => {
    if (attachment?.preview) URL.revokeObjectURL(attachment.preview);
    setAttachment(null);
  };

  const isMediaType = (mime?: string | null) => {
    if (!mime) return false;
    return mime.startsWith('image/') || mime.startsWith('video/');
  };

  const renderAttachmentContent = (m: Message) => {
    if (!m.attachmentUrl) return null;
    const media = isMediaType(m.attachmentType);
    if (media) {
      if (m.attachmentType?.startsWith('video/')) {
        return <video controls src={m.attachmentUrl} className="w-full max-h-64 rounded-xl border border-white/10 bg-black/20" />;
      }
      return (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={m.attachmentUrl}
          alt={m.attachmentName || 'media'}
          className="w-full max-h-64 rounded-xl border border-white/10 bg-black/20 object-cover"
        />
      );
    }
    return (
      <a href={m.attachmentUrl} download={m.attachmentName || 'file'} className="flex items-center gap-2 text-sm underline underline-offset-4">
        📎 {m.attachmentName || 'Файл'}
      </a>
    );
  };

  if (!user) return null;

  return (
    <main className="relative min-h-screen overflow-hidden bg-slate-950 text-slate-50">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-24 -top-32 h-72 w-72 rounded-full bg-blue-500/15 blur-3xl" />
        <div className="absolute right-10 top-6 h-56 w-56 rounded-full bg-indigo-500/15 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-40 w-40 rounded-full bg-cyan-400/15 blur-3xl" />
        <div
          className="absolute inset-0 opacity-20 mix-blend-soft-light"
          style={{
            backgroundImage:
              'radial-gradient(1px 1px at 10% 20%, rgba(255,255,255,0.08), transparent 50%), radial-gradient(1px 1px at 80% 0%, rgba(255,255,255,0.06), transparent 50%), radial-gradient(1px 1px at 50% 100%, rgba(255,255,255,0.05), transparent 50%)',
          }}
        />
      </div>

      <div className="relative z-10 mx-auto grid min-h-screen w-full max-w-7xl grid-cols-1 gap-3 px-3 py-5 md:grid-cols-[170px,360px,1fr] md:gap-5 lg:px-10">
        {/* Mobile header */}
        <div className="flex items-center justify-between rounded-2xl border border-white/5 bg-white/10 p-3 backdrop-blur md:hidden">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-500 text-base font-semibold text-white shadow-lg shadow-blue-500/30">
              {initials(user?.name, user?.email)}
            </div>
            <div>
              <div className="text-sm font-semibold text-white truncate max-w-[140px]">{user?.name || user?.email}</div>
              <div className="text-[11px] text-slate-400">Онлайн</div>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <Link href="/profile" className="rounded-full border border-white/10 px-3 py-1 text-slate-200 hover:bg-white/10 transition">
              Профиль
            </Link>
            <button onClick={() => logout()} className="rounded-full border border-white/10 px-3 py-1 text-rose-200 hover:bg-rose-500/10 transition">
              Выход
            </button>
          </div>
        </div>

        {/* Sidebar */}
        <aside className="hidden md:flex flex-col gap-5 rounded-3xl border border-white/10 bg-gradient-to-b from-white/10 via-white/5 to-white/5 p-4 backdrop-blur-2xl shadow-[0_25px_100px_-60px_rgba(0,0,0,1)]">
          <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/10 px-3 py-3 shadow-lg shadow-blue-500/10">
            <div className="relative">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-500 text-base font-semibold text-white shadow-lg shadow-blue-500/30">
                {initials(user?.name, user?.email)}
              </div>
            </div>
            <div className="min-w-0">
              <div className="truncate text-[15px] font-semibold tracking-tight text-white max-w-[120px]">
                {user?.name || user?.email}
              </div>
              <div className="truncate text-[11px] text-slate-300 max-w-[120px]">{user?.email}</div>
            </div>
          </div>

          <nav className="flex flex-col gap-3 text-sm text-slate-200">
            <Link
              href="/profile"
              className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-3 py-2 transition hover:-translate-y-[1px] hover:bg-white/10 hover:shadow-lg hover:shadow-blue-500/20"
            >
              <span className="text-lg">👤</span>
              <span>Профиль</span>
            </Link>
            <button
              className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-left transition hover:-translate-y-[1px] hover:bg-white/10 hover:shadow-lg hover:shadow-rose-500/20 text-rose-200"
              onClick={() => logout()}
            >
              <span className="text-lg">↩</span>
              <span>Выйти</span>
            </button>
          </nav>

          <div className="space-y-2 rounded-2xl border border-white/10 bg-white/5 p-3 shadow-[0_20px_80px_-60px_rgba(59,130,246,0.6)]">
            <div className="text-center text-[11px] uppercase tracking-[0.2em] text-slate-300">Быстрые действия</div>
            <button
              className="w-full rounded-xl bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 px-3 py-2 text-sm font-semibold text-white shadow-lg shadow-blue-500/30 transition hover:translate-y-[-1px] hover:shadow-xl hover:shadow-blue-500/40 active:translate-y-0"
              onClick={() => {
                document.querySelector('input[placeholder="Придумайте пароль"]')?.scrollIntoView({ behavior: 'smooth' });
              }}
            >
              Создать комнату
            </button>
            <button
              className="w-full rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-sm text-slate-100 transition hover:bg-white/20 hover:-translate-y-[1px]"
              onClick={() => {
                document.querySelector('input[placeholder="Вставьте ID"]')?.scrollIntoView({ behavior: 'smooth' });
              }}
            >
              Войти по коду
            </button>
          </div>
        </aside>

        {/* Chats list */}
        <section className="flex flex-col gap-4 rounded-3xl border border-white/5 bg-white/10 p-4 backdrop-blur-xl shadow-[0_20px_80px_-50px_rgba(0,0,0,1)]">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-white">Чаты</h2>
              <p className="text-sm text-slate-300">Приглашайте людей и начинайте переписку</p>
            </div>
            <span className="hidden items-center gap-2 rounded-full bg-emerald-500/15 px-3 py-1 text-xs text-emerald-100 md:inline-flex">
              <span className="h-2 w-2 rounded-full bg-emerald-300" />
              Online
            </span>
          </div>
          <div className="space-y-3">
            <input
              className="w-full rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-white placeholder:text-slate-500 outline-none ring-0 transition focus:border-blue-400 focus:bg-white/15 focus:ring-2 focus:ring-blue-500/30"
              placeholder="Поиск по контактам"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <div className="rounded-2xl border border-white/5 bg-white/5 p-3">
              <div className="mb-2 flex items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-semibold text-white">Пригласить по email</h3>
                  <span className="text-[11px] text-slate-400">Токен на 30 дней</span>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    api<InviteItem[]>('/connections/invites', { method: 'GET' })
                      .then(setInvites)
                      .catch(() => {})
                  }
                  className="rounded-full border border-white/10 px-3 py-1 text-[11px] text-slate-200 hover:bg-white/10 transition"
                >
                  Обновить
                </button>
              </div>
              <form onSubmit={sendInvite} className="flex flex-col gap-2">
                <input
                  type="email"
                  className="w-full rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-white placeholder:text-slate-500 outline-none ring-0 transition focus:border-blue-400 focus:bg-white/15 focus:ring-2 focus:ring-blue-500/30"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="Email пользователя"
                  required
                />
                <button
                  type="submit"
                  disabled={sendingInvite}
                  className="rounded-xl bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-blue-500/30 transition hover:translate-y-[-1px] hover:shadow-xl hover:shadow-blue-500/40 active:translate-y-0 disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:translate-y-0"
                >
                  {sendingInvite ? 'Отправка…' : 'Отправить приглашение'}
                </button>
              </form>
              {error && <p className="mt-1 text-xs text-red-300">{error}</p>}
          {inviteLink && (
            <div className="mt-2 flex flex-col gap-2 rounded-xl border border-white/5 bg-white/5 p-2">
              <div className="text-[11px] uppercase tracking-wide text-slate-400">Ссылка приглашения</div>
              <div className="flex items-center gap-2">
                <div className="min-w-0 break-all text-xs text-slate-200">{inviteLink}</div>
                <button
                  type="button"
                  className="shrink-0 rounded-full border border-white/10 px-3 py-1 text-[11px] text-slate-200 hover:bg-white/10 transition"
                  onClick={() => navigator.clipboard?.writeText(inviteLink)}
                >
                  Копировать
                </button>
              </div>
            </div>
          )}
          <div className="mt-3 space-y-2 rounded-xl border border-white/5 bg-white/5 p-2">
            <div className="text-[11px] uppercase tracking-wide text-slate-400">У меня есть код/ссылка</div>
            <form onSubmit={joinByToken} className="flex flex-col gap-2">
              <input
                type="text"
                className="w-full rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-white placeholder:text-slate-500 outline-none ring-0 transition focus:border-blue-400 focus:bg-white/15 focus:ring-2 focus:ring-blue-500/30"
                value={joinToken}
                onChange={(e) => setJoinToken(e.target.value)}
                placeholder="Вставьте ссылку или токен"
              />
              <button
                type="submit"
                className="rounded-xl border border-white/10 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10 transition"
              >
                Присоединиться
              </button>
            </form>
          </div>
              {invites.length > 0 && (
                <div className="mt-3 space-y-2 rounded-xl border border-white/5 bg-white/5 p-2">
                  <div className="text-[11px] uppercase tracking-wide text-slate-400">Мои приглашения</div>
                  {invites.slice(0, 4).map((inv) => (
                    <div
                      key={inv.id}
                      className="rounded-lg border border-white/5 bg-white/5 px-3 py-2 text-xs text-slate-200 flex items-center gap-2"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-semibold">{inv.toEmail}</div>
                        <div className="text-[11px] text-slate-400">
                          до {new Date(inv.expiresAt).toLocaleDateString('ru-RU', { day: '2-digit', month: 'short' })}
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <div
                          className={`rounded-full px-2 py-1 text-[11px] font-semibold ${
                            inv.status === 'used'
                              ? 'bg-emerald-500/15 text-emerald-200'
                              : inv.status === 'expired'
                              ? 'bg-rose-500/15 text-rose-200'
                              : 'bg-blue-500/15 text-blue-200'
                          }`}
                        >
                          {inv.status === 'used' ? 'Использовано' : inv.status === 'expired' ? 'Истекло' : 'Активно'}
                        </div>
                        <button
                          type="button"
                          disabled={inv.status === 'used'}
                          className="rounded-full border border-white/10 px-2 py-1 text-[11px] text-rose-200 hover:bg-rose-500/10 transition disabled:opacity-40 disabled:cursor-not-allowed"
                          onClick={() => {
                            api('/connections/invites/' + inv.id, { method: 'DELETE' })
                              .then(() => api<InviteItem[]>('/connections/invites', { method: 'GET' }).then(setInvites).catch(() => {}))
                              .catch(() => {});
                          }}
                        >
                          Удалить
                        </button>
                      </div>
                    </div>
                  ))}
                  {invites.length > 4 && (
                    <div className="text-[11px] text-slate-400">и ещё {invites.length - 4}…</div>
                  )}
                </div>
              )}
            </div>

          <div className="rounded-2xl border border-white/5 bg-white/5 p-3">
            <div className="mb-2 flex items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-semibold text-white">Комнаты по паролю</h3>
                <span className="text-[11px] text-slate-400">Выберите комнату, чтобы открыть чат</span>
              </div>
              <button
                type="button"
                onClick={() =>
                  api<Room[]>('/rooms')
                    .then(setRooms)
                    .catch(() => {})
                }
                className="rounded-full border border-white/10 px-3 py-1 text-[11px] text-slate-200 hover:bg-white/10 transition"
              >
                Обновить
              </button>
            </div>
            {rooms.length === 0 ? (
              <p className="text-sm text-slate-300">Пока нет комнат. Создайте в профиле или присоединитесь по коду.</p>
            ) : (
              <div className="space-y-2">
                {rooms.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => {
                      setSelected(null);
                      setSelectedRoom(r);
                    }}
                    className={`w-full rounded-2xl border px-3 py-2 text-left transition ${
                      selectedRoom?.id === r.id
                        ? 'border-blue-400/50 bg-blue-500/10 shadow-lg shadow-blue-500/20'
                        : 'border-white/5 bg-white/5 hover:border-blue-300/30 hover:bg-white/10'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-sm font-semibold text-white">
                        🔒
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-semibold text-white">{r.name}</div>
                        <div className="truncate text-[11px] text-slate-400">ID: {r.id}</div>
                        <div className="text-[11px] text-slate-400">
                          {r.isOwner ? 'Вы владелец' : `Владелец: ${r.owner.name || r.owner.email}`}
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
          </div>

          <div className="flex-1 space-y-2 overflow-y-auto pr-1">
            {loading ? (
              <p className="text-slate-300">Загрузка...</p>
            ) : filteredConnections.length === 0 ? (
              <p className="text-sm text-slate-300">Контактов пока нет. Отправьте приглашение.</p>
            ) : (
              filteredConnections.map((c) => (
                <button
                  key={c.id}
                  onClick={() => {
                    setSelected(c);
                    setSelectedRoom(null);
                  }}
                  className={`w-full rounded-2xl border px-3 py-3 text-left transition ${
                    selected?.id === c.id
                      ? 'border-blue-400/50 bg-blue-500/10 shadow-lg shadow-blue-500/20'
                      : 'border-white/5 bg-white/5 hover:border-blue-300/30 hover:bg-white/10'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-sm font-semibold text-white">
                      {initials(c.user.name, c.user.email)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-semibold text-white">{c.user.name || c.user.email}</div>
                      <div className="truncate text-xs text-slate-400">{c.user.email}</div>
                    </div>
                    <span className="text-xs text-blue-200">Открыть</span>
                  </div>
                </button>
              ))
            )}
          </div>
        </section>

        {/* Chat panel */}
        <section className="relative flex min-h-[560px] flex-col overflow-hidden rounded-3xl border border-white/5 bg-white/10 backdrop-blur-xl shadow-[0_30px_140px_-80px_rgba(0,0,0,1)]">
          {selected || selectedRoom ? (
            <div className="flex h-full flex-col">
              <div className="flex items-center gap-3 border-b border-white/5 bg-white/5 px-5 pb-3 pt-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-lg font-semibold text-white">
                  {selectedRoom ? '🔒' : initials(selected?.user.name, selected?.user.email)}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="truncate text-lg font-semibold text-white">{selectedName}</h3>
                  </div>
                  <p className="flex items-center gap-2 text-sm text-slate-300">
                    <span className="h-2 w-2 rounded-full bg-emerald-400" />
                    {selectedRoom ? 'Комната' : 'онлайн'}
                  </p>
                </div>
              </div>

              <div ref={chatRef} className="flex-1 space-y-3 overflow-y-auto px-5 py-4">
                {isRoomChat ? (
                  loadingRoomMessages ? (
                    <p className="text-slate-300">Загрузка сообщений комнаты...</p>
                  ) : chatMessages.length === 0 ? (
                    <p className="text-slate-300">В этой комнате пока тихо. Напишите первое сообщение.</p>
                  ) : (
                    groupedMessages.map((group) => (
                      <div key={group.title} className="space-y-2">
                        <div className="text-center text-xs text-slate-400">
                          <span className="inline-flex rounded-full border border-white/5 bg-white/5 px-3 py-1 text-slate-200">
                            {group.title}
                          </span>
                        </div>
                        {group.items.map((m) => {
                          const isMine = m.senderId === user.id;
                          const senderName = (m as RoomMessage).sender?.name || (m as RoomMessage).sender?.email || '';
                          const bubbleBase = `max-w-[72%] rounded-2xl px-3 py-2 text-sm shadow ${
                            isMine
                              ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white bubble-right'
                              : 'bg-white/10 text-white border border-white/5 bubble-left'
                          }`;
                          return (
                            <div key={m.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                              <div className={bubbleBase}>
                                {!isMine && senderName && (
                                  <div className="text-[11px] font-semibold text-white/80 mb-1">{senderName}</div>
                                )}
                                {m.text && <div>{m.text}</div>}
                                <div className={`mt-1 text-[11px] opacity-70 ${isMine ? 'text-white/80' : 'text-slate-300'}`}>
                                  {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ))
                  )
                ) : loadingMessages ? (
                  <p className="text-slate-300">Загрузка сообщений...</p>
                ) : chatMessages.length === 0 ? (
                  <p className="text-slate-300">Сообщений пока нет. Напишите первое сообщение.</p>
                ) : (
                  groupedMessages.map((group) => (
                    <div key={group.title} className="space-y-2">
                      <div className="text-center text-xs text-slate-400">
                        <span className="inline-flex rounded-full border border-white/5 bg-white/5 px-3 py-1 text-slate-200">
                          {group.title}
                        </span>
                      </div>
                      {group.items.map((m) => {
                        const isMine = m.senderId === user.id;
                        const bubbleBase = `max-w-[72%] rounded-2xl px-3 py-2 text-sm shadow ${
                          isMine
                            ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white bubble-right'
                            : 'bg-white/10 text-white border border-white/5 bubble-left'
                        }`;
                        return (
                          <div key={m.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                            <div className={bubbleBase}>
                              {(m as Message).attachmentUrl && (
                                <div className="space-y-2">
                                  <div className="text-xs uppercase tracking-wide opacity-80">
                                    {isMediaType((m as Message).attachmentType) ? 'Фото/видео' : 'Файл'}
                                  </div>
                                  {renderAttachmentContent(m as Message)}
                                  {(m as Message).attachmentName && (
                                    <div className="text-xs opacity-80 break-all">{(m as Message).attachmentName}</div>
                                  )}
                                </div>
                              )}
                              {m.text && <div className={(m as Message).attachmentUrl ? 'mt-2' : ''}>{m.text}</div>}
                              <div className={`mt-1 text-[11px] opacity-70 ${isMine ? 'text-white/80' : 'text-slate-300'}`}>
                                {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ))
                )}
                {!isRoomChat && isTyping && (
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <span className="h-2 w-2 animate-pulse rounded-full bg-blue-300" />
                    Собеседник печатает...
                  </div>
                )}
              </div>

              <form onSubmit={sendMessage} className="border-t border-white/5 bg-white/5 px-4 py-3">
                <div className="relative flex flex-col gap-2">
                  {!isRoomChat && attachment && (
                    <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">📎</span>
                        <div>
                          <div className="font-medium">{attachment.name}</div>
                          <div className="text-xs text-slate-300">{attachment.type === 'media' ? 'Фото/видео' : 'Файл'}</div>
                        </div>
                      </div>
                      <button type="button" onClick={clearAttachment} className="text-xs text-slate-300 hover:text-white">
                        Убрать
                      </button>
                    </div>
                  )}
                  <div className="relative flex items-center gap-2 rounded-2xl border border-white/10 bg-slate-900/70 px-3 py-2 text-slate-50">
                    {!isRoomChat && (
                      <button
                        type="button"
                        onClick={() => setShowAttach((v) => !v)}
                        className="rounded-full p-2 text-slate-200 transition hover:bg-white/10"
                        aria-label="Прикрепить"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-6 w-6">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 8.25v7.5a2.25 2.25 0 0 0 4.5 0V7.5a3.75 3.75 0 1 0-7.5 0v8.25a5.25 5.25 0 0 0 10.5 0V9" />
                        </svg>
                      </button>
                    )}

                    {!isRoomChat && showAttach && (
                      <div className="absolute bottom-full left-0 mb-3 w-56 rounded-xl border border-white/10 bg-slate-900/90 py-2 text-sm text-slate-100 shadow-xl">
                        <button
                          type="button"
                          className="flex w-full items-center gap-3 px-4 py-2 transition hover:bg-white/10"
                          onClick={() => mediaInputRef.current?.click()}
                        >
                          <span className="flex h-5 w-5 items-center justify-center rounded-full border border-white/20 text-[11px]">
                            +
                          </span>
                          Фото или видео
                        </button>
                        <button
                          type="button"
                          className="flex w-full items-center gap-3 px-4 py-2 transition hover:bg-white/10"
                          onClick={() => fileInputRef.current?.click()}
                        >
                          <span className="flex h-5 w-5 items-center justify-center rounded-full border border-white/20 text-[11px]">
                            +
                          </span>
                          Файл
                        </button>
                      </div>
                    )}

                    <input
                      className="flex-1 bg-transparent text-sm placeholder:text-slate-500 outline-none"
                      value={messageText}
                      onChange={(e) => {
                        setMessageText(e.target.value);
                        if (!isRoomChat) {
                          setIsTyping(true);
                          setTimeout(() => setIsTyping(false), 1500);
                        }
                      }}
                      placeholder={isRoomChat ? 'Сообщение в комнату...' : 'Сообщение...'}
                    />

                    <button
                      type="submit"
                      className="rounded-xl bg-gradient-to-r from-blue-500 to-indigo-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-blue-500/30 transition hover:translate-y-[-1px] hover:shadow-xl hover:shadow-blue-500/40 active:translate-y-0"
                    >
                      Отправить
                    </button>
                  </div>
                  {!isRoomChat && (
                    <>
                      <input
                        ref={mediaInputRef}
                        type="file"
                        accept="image/*,video/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handlePick(file, 'media');
                          e.target.value = '';
                        }}
                      />
                      <input
                        ref={fileInputRef}
                        type="file"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handlePick(file, 'file');
                          e.target.value = '';
                        }}
                      />
                    </>
                  )}
                </div>
              </form>
            </div>
          ) : (
            <div className="relative flex h-full flex-col items-center justify-center gap-4 overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-900/20 via-slate-900/40 to-slate-950" />
              <div className="relative z-10 flex flex-col items-center gap-3 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-500/20 text-2xl">💬</div>
                <h3 className="text-xl font-semibold text-white">Выберите контакт или комнату</h3>
                <p className="max-w-md text-sm text-slate-300">
                  Здесь появится переписка, как только вы выберете контакт слева или отправите приглашение/код комнаты.
                </p>
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

export default function Dashboard() {
  return (
    <Suspense fallback={null}>
      <DashboardInner />
    </Suspense>
  );
}
