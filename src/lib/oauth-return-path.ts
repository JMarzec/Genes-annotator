export function oauthReturnPath(value: unknown): string {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//') || value.includes('\\') || [...value].some(c => c.charCodeAt(0) < 32 || c.charCodeAt(0) === 127)) return '/';
  const origin = 'https://app.invalid';
  try { const target = new URL(value, origin); if (target.origin !== origin || target.pathname.startsWith('//')) return '/'; return target.pathname + target.search + target.hash; } catch { return '/'; }
}
