import type { NextRequest } from 'next/server';
import { getNeonAuth } from '@/lib/auth-server';

export const dynamic = 'force-dynamic';
type Context = { params: Promise<{ path: string[] }> };
async function handle(request: NextRequest, context: Context) {
  const auth = getNeonAuth();
  if (!auth) return Response.json({ message: 'Accounts are not configured yet.' }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
  const handlers = auth.handler();
  const method = request.method as keyof typeof handlers;
  const handler = handlers[method];
  if (!handler) return new Response(null, { status: 405 });
  return handler(request, context);
}
export const GET = handle;
export const POST = handle;
