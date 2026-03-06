'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '../store/auth';

export default function LandingPage() {
  const router = useRouter();
  const { accessToken } = useAuthStore();

  useEffect(() => {
    if (accessToken) {
      router.replace('/dashboard');
    }
  }, [accessToken, router]);

  return (
    <main
      className="flex min-h-screen items-center justify-center px-4"
      style={{ background: 'linear-gradient(to bottom, #020617, #0f172a)', color: '#f8fafc' }}
    >
      <div
        className="landing-card flex flex-col items-center gap-8 rounded-3xl px-10 py-10 text-center sm:px-14 sm:py-12"
        style={{
          border: '1px solid rgba(255,255,255,0.08)',
          background: 'rgba(15,23,42,0.75)',
          boxShadow: '0 30px 100px rgba(15,23,42,0.9)',
        }}
      >
        <h1
          className="text-4xl font-semibold tracking-[0.45em] sm:text-5xl lg:text-6xl"
          style={{ color: '#f8fafc' }}
        >
          C O N N E X Y
        </h1>
        <p
          className="max-w-sm text-slate-400 text-sm leading-relaxed sm:text-base"
          style={{ color: 'rgba(148,163,184,0.95)' }}
        >
          Ваше пространство для приватного общения.
          <br />
          Комнаты и чат только для людей, которых вы выбрали.
        </p>
        <button
          type="button"
          onClick={() => router.push('/auth/register')}
          className="landing-button mt-1 rounded-full px-12 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 active:translate-y-0"
          style={{
            background: 'linear-gradient(to right, #3b82f6, #6366f1, #8b5cf6)',
            boxShadow: '0 18px 45px rgba(56,189,248,0.35)',
          }}
        >
          Get started
        </button>
      </div>
    </main>
  );
}
