'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
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
type Grouped = { title: string; items: Message[] };
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

export default function Dashboard() {
  const router = useRouter();
  const { user, accessToken, logout, hydrated } = useAuthStore();
  const [connections, setConnections] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteLink, setInviteLink] = useState('');
  const [error, setError] = useState('');
  const [invites, setInvites] = useState<InviteItem[]>([]);
  const [selected, setSelected] = useState<Connection | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [messageText, setMessageText] = useState('');
  const [showAttach, setShowAttach] = useState(false);
  const [attachment, setAttachment] = useState<AttachmentDraft | null>(null);
  const mediaInputRef = useRef<HTMLInputElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [search, setSearch] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const chatRef = useRef<HTMLDivElement | null>(null);

  const selectedName = useMemo(() => selected?.user.name || selected?.user.email || '', [selected]);
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
  }, [accessToken, router, hydrated]);

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
    if (!chatRef.current) return;
    chatRef.current.scrollTo({ top: chatRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  const groupedMessages: Grouped[] = useMemo(() => {
    const byDate = new Map<string, Message[]>();
    messages.forEach((m) => {
      const key = new Date(m.createdAt).toDateString();
      if (!byDate.has(key)) byDate.set(key, []);
      byDate.get(key)!.push(m);
    });
    const formatter = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
    return Array.from(byDate.entries())
      .sort((a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime())
      .map(([key, items]) => ({ title: formatter.format(new Date(key)), items }));
  }, [messages]);

  const sendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setInviteLink('');
    try {
      const res = await api<{ ok: boolean; link?: string; error?: string }>('/connections/invite', {
        method: 'POST',
        body: JSON.stringify({ email: inviteEmail.trim() }),
      });
      if (!res.ok || !res.link) {
        setError(res.error || 'Не удалось отправить приглашение');
      } else {
        setInviteLink(res.link);
        setInviteEmail('');
        api<InviteItem[]>('/connections/invites', { method: 'GET' })
          .then(setInvites)
          .catch(() => {});
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка запроса');
    }
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
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

      <div className="relative z-10 mx-auto grid min-h-screen w-full max-w-7xl grid-cols-1 gap-3 px-3 py-5 md:grid-cols-[82px,320px,1fr] md:gap-4 lg:px-8">
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
        <aside className="hidden md:flex flex-col items-center gap-4 rounded-2xl border border-white/5 bg-white/10 p-4 backdrop-blur-lg shadow-[0_20px_80px_-60px_rgba(0,0,0,1)] overflow-hidden">
          <div className="relative">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-500 text-lg font-semibold text-white shadow-lg shadow-blue-500/30">
              {initials(user?.name, user?.email)}
            </div>
            <span className="absolute -right-1 -top-1 h-3 w-3 rounded-full bg-emerald-400 ring-4 ring-slate-900" />
          </div>
          <div className="flex flex-col items-center gap-3 text-sm text-slate-200">
            <Link className="rounded-full bg-white/5 px-4 py-2 hover:bg-white/10 transition" href="/profile">
              Профиль
            </Link>
            <button className="rounded-full px-4 py-2 text-red-200 hover:bg-red-500/10 transition" onClick={() => logout()}>
              Выйти
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
                  className="rounded-xl bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-blue-500/30 transition hover:translate-y-[-1px] hover:shadow-xl hover:shadow-blue-500/40 active:translate-y-0"
                >
                  Отправить приглашение
                </button>
              </form>
              {error && <p className="mt-1 text-xs text-red-300">{error}</p>}
              {inviteLink && (
                <p className="mt-1 break-all text-xs text-slate-200">
                  Ссылка: <a className="text-blue-200 underline" href={inviteLink}>{inviteLink}</a>
                </p>
              )}
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
                  onClick={() => setSelected(c)}
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
          {selected ? (
            <div className="flex h-full flex-col">
              <div className="flex items-center gap-3 border-b border-white/5 bg-white/5 px-5 pb-3 pt-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-lg font-semibold text-white">
                  {initials(selected.user.name, selected.user.email)}
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">{selectedName}</h3>
                  <p className="flex items-center gap-2 text-sm text-slate-300">
                    <span className="h-2 w-2 rounded-full bg-emerald-400" />
                    онлайн
                  </p>
                </div>
                <div className="ml-auto flex items-center gap-3 text-sm text-slate-300">
                  <button className="rounded-full px-3 py-1 transition hover:bg-white/10">Профиль</button>
                  <button className="rounded-full px-3 py-1 transition hover:bg-white/10">Пригласить</button>
                </div>
              </div>

              <div ref={chatRef} className="flex-1 space-y-3 overflow-y-auto px-5 py-4">
                {loadingMessages ? (
                  <p className="text-slate-300">Загрузка сообщений...</p>
                ) : messages.length === 0 ? (
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
                              {m.attachmentUrl && (
                                <div className="space-y-2">
                                  <div className="text-xs uppercase tracking-wide opacity-80">
                                    {isMediaType(m.attachmentType) ? 'Фото/видео' : 'Файл'}
                                  </div>
                                  {renderAttachmentContent(m)}
                                  {m.attachmentName && <div className="text-xs opacity-80 break-all">{m.attachmentName}</div>}
                                </div>
                              )}
                              {m.text && <div className={m.attachmentUrl ? 'mt-2' : ''}>{m.text}</div>}
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
                {isTyping && (
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <span className="h-2 w-2 animate-pulse rounded-full bg-blue-300" />
                    Собеседник печатает...
                  </div>
                )}
              </div>

              <form onSubmit={sendMessage} className="border-t border-white/5 bg-white/5 px-4 py-3">
                <div className="relative flex flex-col gap-2">
                  {attachment && (
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

                    {showAttach && (
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
                        setIsTyping(true);
                        setTimeout(() => setIsTyping(false), 1500);
                      }}
                      placeholder="Сообщение..."
                    />

                    <button
                      type="submit"
                      className="rounded-xl bg-gradient-to-r from-blue-500 to-indigo-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-blue-500/30 transition hover:translate-y-[-1px] hover:shadow-xl hover:shadow-blue-500/40 active:translate-y-0"
                    >
                      Отправить
                    </button>
                  </div>
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
                </div>
              </form>
            </div>
          ) : (
            <div className="relative flex h-full flex-col items-center justify-center gap-4 overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-900/20 via-slate-900/40 to-slate-950" />
              <div className="relative z-10 flex flex-col items-center gap-3 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-500/20 text-2xl">💬</div>
                <h3 className="text-xl font-semibold text-white">Выберите контакт, чтобы начать чат</h3>
                <p className="max-w-md text-sm text-slate-300">
                  Здесь появится переписка, как только вы выберете контакт слева или отправите приглашение новому пользователю.
                </p>
                <button
                  onClick={() => {
                    document.querySelector('input[type="email"]')?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="rounded-xl bg-gradient-to-r from-blue-500 to-indigo-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-blue-500/30 transition hover:translate-y-[-1px] hover:shadow-xl hover:shadow-blue-500/40 active:translate-y-0"
                >
                  Пригласить первого собеседника
                </button>
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
