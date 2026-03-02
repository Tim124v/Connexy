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
  const [selected, setSelected] = useState<Connection | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [messageText, setMessageText] = useState('');
  const [showAttach, setShowAttach] = useState(false);
  const [attachment, setAttachment] = useState<AttachmentDraft | null>(null);
  const mediaInputRef = useRef<HTMLInputElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [search, setSearch] = useState('');
  const chatRef = useRef<HTMLDivElement | null>(null);

  const selectedName = useMemo(() => selected?.user.name || selected?.user.email || '', [selected]);
  const filteredConnections = useMemo(() => {
    if (!search.trim()) return connections;
    const q = search.toLowerCase();
    return connections.filter(
      (c) =>
        c.user.email.toLowerCase().includes(q) ||
        (c.user.name || '').toLowerCase().includes(q),
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
          attachment: uploaded
            ? { url: uploaded.url, name: uploaded.originalName, type: uploaded.mimeType }
            : undefined,
        }),
      });
      setMessages((prev) => [...prev, msg]);
    } catch {
      // rollback input
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
        return (
          <video
            controls
            src={m.attachmentUrl}
            className="w-full max-h-64 rounded-xl border border-white/10 bg-black/20"
          />
        );
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
      <a
        href={m.attachmentUrl}
        download={m.attachmentName || 'file'}
        className="flex items-center gap-2 text-sm underline underline-offset-4"
      >
        📎 {m.attachmentName || 'Файл'}
      </a>
    );
  };

  if (!user) return null;

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 dark:from-slate-900 dark:via-slate-900 dark:to-slate-950">
      <div className="mx-auto max-w-6xl h-screen md:h-[92vh] grid grid-cols-1 md:grid-cols-[72px,320px,1fr] gap-4 p-4">
        {/* Sidebar */}
        <aside className="hidden md:flex flex-col items-center gap-4 rounded-2xl border bg-white/90 dark:bg-slate-800/80 dark:border-slate-700 backdrop-blur shadow-lg p-3">
          <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-200 flex items-center justify-center font-semibold text-lg">
            {initials(user?.name, user?.email)}
          </div>
          <div className="flex flex-col items-center gap-3 text-sm text-gray-500 dark:text-slate-300">
            <Link href="/profile" className="hover:text-blue-600 dark:hover:text-blue-400 transition">
              Профиль
            </Link>
            <button className="hover:text-blue-600 dark:hover:text-blue-400 transition" onClick={() => logout()}>
              Выйти
            </button>
          </div>
        </aside>

        {/* Chats list */}
        <section className="rounded-2xl border bg-white/90 dark:bg-slate-800/80 dark:border-slate-700 backdrop-blur shadow-lg p-4 flex flex-col gap-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-50">Чаты</h2>
            <p className="text-sm text-gray-500 dark:text-slate-400">Приглашайте людей и начинайте переписку</p>
          </div>
          <div className="space-y-3">
            <input
              className="w-full border rounded-lg px-3 py-2 bg-gray-50 dark:bg-slate-700 dark:border-slate-600 dark:text-slate-50 focus:bg-white dark:focus:bg-slate-600 focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-500 focus:outline-none"
              placeholder="Поиск по контактам"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <div className="rounded-xl border bg-gray-50/80 dark:bg-slate-700/70 dark:border-slate-600 p-3">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-slate-50 mb-2">Пригласить по email</h3>
              <form onSubmit={sendInvite} className="flex flex-col gap-2">
                <input
                  type="email"
                  className="w-full border rounded-lg px-3 py-2 bg-white dark:bg-slate-600 dark:border-slate-500 dark:text-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-500"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="Email пользователя"
                  required
                />
                <button type="submit" className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition dark:bg-blue-500 dark:hover:bg-blue-400">
                  Отправить приглашение
                </button>
              </form>
              {error && <p className="text-xs text-red-400 mt-1">{error}</p>}
              {inviteLink && (
                <p className="text-xs text-gray-700 dark:text-slate-200 break-all mt-1">
                  Ссылка: <a className="text-blue-600 dark:text-blue-400 underline" href={inviteLink}>{inviteLink}</a>
                </p>
              )}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto space-y-2 pr-1">
            {loading ? (
              <p className="text-gray-500 dark:text-slate-300">Загрузка...</p>
            ) : filteredConnections.length === 0 ? (
              <p className="text-gray-500 dark:text-slate-300 text-sm">Контактов пока нет. Отправьте приглашение.</p>
            ) : (
              filteredConnections.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setSelected(c)}
                  className={`w-full text-left p-3 rounded-xl border flex items-center justify-between transition ${
                    selected?.id === c.id
                      ? 'bg-blue-50 border-blue-200 shadow-sm dark:bg-blue-900/40 dark:border-blue-800'
                      : 'bg-white hover:bg-gray-50 dark:bg-slate-700 dark:hover:bg-slate-600 dark:border-slate-600'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-200 flex items-center justify-center font-semibold">
                      {initials(c.user.name, c.user.email)}
                    </div>
                    <div className="space-y-0.5">
                      <div className="font-medium text-gray-900 dark:text-slate-50 truncate">{c.user.name || c.user.email}</div>
                      <div className="text-xs text-gray-500 dark:text-slate-300 truncate">{c.user.email}</div>
                    </div>
                  </div>
                  <span className="text-xs text-blue-600 dark:text-blue-300">Открыть</span>
                </button>
              ))
            )}
          </div>
        </section>

        {/* Chat panel */}
        <section className="rounded-2xl border bg-white/90 dark:bg-slate-800/80 dark:border-slate-700 backdrop-blur shadow-lg min-h-[540px] flex flex-col relative overflow-hidden">
          {selected ? (
            <div className="flex flex-col h-full">
              <div className="pb-3 border-b px-5 pt-4 flex items-center gap-3 bg-white/70 dark:bg-slate-800/70 backdrop-blur">
                <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-200 flex items-center justify-center font-semibold text-lg">
                  {initials(selected.user.name, selected.user.email)}
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-50">{selectedName}</h3>
                  <p className="text-sm text-gray-500 dark:text-slate-300 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                    онлайн
                  </p>
                </div>
                <div className="ml-auto flex items-center gap-3 text-sm text-gray-500 dark:text-slate-300">
                  <button className="hover:text-blue-600 dark:hover:text-blue-400 transition">Профиль</button>
                  <button className="hover:text-blue-600 dark:hover:text-blue-400 transition">Пригласить</button>
                </div>
              </div>

              <div ref={chatRef} className="flex-1 overflow-y-auto py-4 space-y-3 px-5">
                {loadingMessages ? (
                  <p className="text-gray-500 dark:text-slate-300">Загрузка сообщений...</p>
                ) : messages.length === 0 ? (
                  <p className="text-gray-500 dark:text-slate-300">Сообщений пока нет. Напишите первое сообщение.</p>
                ) : (
                  groupedMessages.map((group) => (
                    <div key={group.title} className="space-y-2">
                      <div className="text-center text-xs text-gray-500 dark:text-slate-300">
                        <span className="inline-flex px-3 py-1 rounded-full bg-gray-100 dark:bg-slate-700 dark:text-slate-200 border dark:border-slate-600 text-gray-600">
                          {group.title}
                        </span>
                      </div>
                      {group.items.map((m) => {
                        const isMine = m.senderId === user.id;
                        const bubbleBase = `max-w-[72%] rounded-2xl px-3 py-2 text-sm shadow-sm ${
                          isMine
                            ? 'bg-blue-600 text-white bubble-right'
                            : 'bg-[#e9eef5] text-gray-900 border bubble-left dark:bg-slate-700 dark:border-slate-600 dark:text-slate-50'
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
                                  {m.attachmentName && (
                                    <div className="text-xs opacity-80 break-all">{m.attachmentName}</div>
                                  )}
                                </div>
                              )}
                              {m.text && <div className={m.attachmentUrl ? 'mt-2' : ''}>{m.text}</div>}
                              <div
                                className={`text-[11px] opacity-70 mt-1 ${
                                  isMine ? 'text-white/80' : 'text-gray-500 dark:text-slate-300'
                                }`}
                              >
                                {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ))
                )}
              </div>

              <form onSubmit={sendMessage} className="p-4 border-t bg-white/70 dark:bg-slate-800/60 backdrop-blur">
                <div className="relative flex flex-col gap-2">
                  {attachment && (
                    <div className="flex items-center justify-between rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100">
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
                  <div className="relative flex items-center gap-2 rounded-2xl border bg-slate-900/60 text-slate-50 px-3 py-2 dark:border-slate-700">
                    <button
                      type="button"
                      onClick={() => setShowAttach((v) => !v)}
                      className="p-2 rounded-full hover:bg-slate-800 text-slate-200"
                      aria-label="Прикрепить"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 8.25v7.5a2.25 2.25 0 0 0 4.5 0V7.5a3.75 3.75 0 1 0-7.5 0v8.25a5.25 5.25 0 0 0 10.5 0V9" />
                      </svg>
                    </button>

                    {showAttach && (
                      <div className="absolute bottom-full left-0 mb-3 w-56 rounded-xl border border-slate-700 bg-slate-900 shadow-lg text-sm text-slate-100 py-2">
                        <button
                          type="button"
                          className="w-full text-left px-4 py-2 hover:bg-slate-800 flex items-center gap-3"
                          onClick={() => mediaInputRef.current?.click()}
                        >
                          <span className="w-5 h-5 rounded-full border border-slate-600 flex items-center justify-center text-[11px]">
                            +
                          </span>
                          Фото или видео
                        </button>
                        <button
                          type="button"
                          className="w-full text-left px-4 py-2 hover:bg-slate-800 flex items-center gap-3"
                          onClick={() => fileInputRef.current?.click()}
                        >
                          <span className="w-5 h-5 rounded-full border border-slate-600 flex items-center justify-center text-[11px]">
                            +
                          </span>
                          Файл
                        </button>
                      </div>
                    )}

                    <input
                      className="flex-1 bg-transparent placeholder:text-slate-400 focus:outline-none text-sm sm:text-base"
                      value={messageText}
                      onChange={(e) => setMessageText(e.target.value)}
                      placeholder="Сообщение..."
                    />

                    <button
                      type="submit"
                      className="ml-1 px-4 py-2 rounded-xl bg-blue-600 text-white hover:bg-blue-700 transition dark:bg-blue-500 dark:hover:bg-blue-400"
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
            <>
              <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-purple-50 opacity-70 dark:from-slate-800 dark:via-slate-800 dark:to-slate-900" />
              <div className="relative z-10 space-y-3 max-w-md mx-auto text-center py-16 px-6">
                <div className="w-16 h-16 mx-auto rounded-full bg-blue-100 dark:bg-blue-900/60 flex items-center justify-center text-2xl">💬</div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-slate-50">Выберите контакт, чтобы начать чат</h3>
                <p className="text-gray-600 dark:text-slate-300">
                  Здесь появится переписка, как только вы выберете контакт слева или отправите приглашение новому пользователю.
                </p>
                <div className="pt-2">
                  <button
                    onClick={() => {
                      document.querySelector('input[type="email"]')?.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition dark:bg-blue-500 dark:hover:bg-blue-400"
                  >
                    Пригласить первого собеседника
                  </button>
                </div>
              </div>
            </>
          )}
        </section>
      </div>
    </main>
  );
}
