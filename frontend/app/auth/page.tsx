'use client';

import Link from 'next/link';

export default function AuthIndex() {
  return (
    <main className="min-h-screen flex items-center justify-center p-4 bg-gray-100">
      <div className="w-full max-w-sm bg-white rounded-xl shadow p-6 space-y-3">
        <h1 className="text-xl font-semibold">Аккаунт</h1>
        <p className="text-gray-700">Выберите действие:</p>
        <div className="space-y-2">
          <Link href="/auth/login" className="block text-center bg-blue-600 text-white py-2 rounded-lg">
            Войти
          </Link>
          <Link href="/auth/register" className="block text-center border py-2 rounded-lg">
            Зарегистрироваться
          </Link>
        </div>
      </div>
    </main>
  );
}
