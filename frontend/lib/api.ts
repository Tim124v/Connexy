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
  const contentType = res.headers.get('content-type') || '';
  const isJson = contentType.includes('application/json');

  if (!res.ok) {
    const err = isJson
      ? await res.json().catch(() => ({ message: res.statusText }))
      : { message: res.statusText };
    throw new Error((err as { message?: string }).message || res.statusText);
  }

  if (!isJson) {
    const text = await res.text();
    if (text.trimStart().startsWith('<'))
      throw new Error('Сервер вернул страницу вместо данных. Проверьте, что бэкенд запущен на ' + API_URL);
    throw new Error('Сервер вернул неверный формат ответа');
  }
  return res.json() as Promise<T>;
}
