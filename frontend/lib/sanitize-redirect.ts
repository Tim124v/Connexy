/**
 * Разрешает только внутренние пути для редиректа после логина/регистрации.
 * Блокирует открытый редирект на внешние URL (protocol, hostname, //).
 */
export function sanitizeRedirect(redirect: string | null): string | null {
  if (redirect == null || typeof redirect !== 'string') return null;
  const r = redirect.trim();
  if (r === '') return null;
  if (!r.startsWith('/') || r.startsWith('//') || r.includes('://')) return null;
  return r;
}
