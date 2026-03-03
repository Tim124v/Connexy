'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '../../../store/auth';
import { api } from '../../../lib/api';

export default function InvitePage() {
  const params = useParams();
  const router = useRouter();
  const token = params.token as string;
  const { accessToken } = useAuthStore();
  const [status, setStatus] = useState<'loading' | 'ok' | 'error'>('loading');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      return;
    }
    if (!accessToken) {
      router.replace(`/auth/login?redirect=/invite/${token}`);
      return;
    }
    api<{ ok: boolean; contact?: { id: string; email: string; name: string | null } }>(`/connections/accept`, {
      method: 'POST',
      body: JSON.stringify({ token }),
    })
      .then((res) => {
        if (res.ok) {
          setStatus('ok');
          const select = res.contact?.id ? `?select=${res.contact.id}` : '';
          router.replace(`/dashboard${select}`);
        } else {
          setStatus('error');
        }
      })
      .catch(() => setStatus('error'));
  }, [token, accessToken, router]);

  return (
    <main className="min-h-screen flex items-center justify-center p-4 bg-gray-100">
      <div className="bg-white rounded-xl shadow p-6">
        {status === 'loading' && <p>Принятие приглашения...</p>}
        {status === 'ok' && <p>Успешно. Контакт добавлен, переходим в чат...</p>}
        {status === 'error' && (
          <div>
            <p className="text-red-600">Не удалось принять приглашение (неверная ссылка или другой email).</p>
            <Link href="/" className="text-blue-600 underline mt-2 inline-block">
              На главную
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}
