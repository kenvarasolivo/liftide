import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { getNeonAuth } from '@/lib/auth-server';

// Neon handles verification callback token exchange. Guest training stays open.
export default async function proxy(request: NextRequest) {
  const auth = getNeonAuth();
  return auth ? auth.middleware({ loginUrl: '/login' })(request) : NextResponse.next();
}
export const config = { matcher: ['/auth/callback'] };
