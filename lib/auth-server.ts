import 'server-only';
import { createNeonAuth } from '@neondatabase/auth/next/server';

export function authConfigured() {
  const url = process.env.NEON_AUTH_BASE_URL;
  try { return Boolean(url && new URL(url).protocol === 'https:' && (process.env.NEON_AUTH_COOKIE_SECRET?.length ?? 0) >= 32 && process.env.DATABASE_URL); }
  catch { return false; }
}
let auth: ReturnType<typeof createNeonAuth> | undefined;
export function getNeonAuth() {
  if (!authConfigured()) return null;
  auth ??= createNeonAuth({ baseUrl: process.env.NEON_AUTH_BASE_URL!, cookies: { secret: process.env.NEON_AUTH_COOKIE_SECRET!, sessionDataTtl: 60 } });
  return auth;
}
