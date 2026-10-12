import { authConfigured } from '@/lib/auth-server';
export const dynamic = 'force-dynamic';
export async function GET() {
  return Response.json({ configured: authConfigured() }, { headers: { 'Cache-Control': 'no-store' } });
}
