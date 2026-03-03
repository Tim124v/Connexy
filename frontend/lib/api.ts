const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export function getAuthHeaders(): HeadersInit {
  if (typeof window === 'undefined') return {};
  const token = localStorage.getItem('accessToken');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function api<T>(
  path: string,
  options: RequestInit & { token?: string } = {},
): Promise<T> {
  const { token, ...rest } = options;
  const auth =
    token !== undefined
      ? token
      : typeof window !== 'undefined'
        ? localStorage.getItem('accessToken') || ''
        : '';
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(auth ? { Authorization: `Bearer ${auth}` } : {}),
    ...rest.headers,
  };
  const res = await fetch(`${API_URL}${path}`, { ...rest, headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error((err as { message?: string }).message || res.statusText);
  }
  return res.json() as Promise<T>;
}
