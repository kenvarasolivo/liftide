import { getNeonAuth } from '@/lib/auth-server';
import { parseTraining } from '@/lib/machine-training';
import { readAccountTraining, writeAccountTraining } from '@/lib/training-database';

export const dynamic = 'force-dynamic';
const headers = { 'Cache-Control': 'no-store' };
export async function GET() {
  try {
    const auth = getNeonAuth();
    if (!auth) return Response.json({ error: 'Accounts are not configured.' }, { status: 503, headers });
    const { data: session, error } = await auth.getSession();
    if (error || !session?.user) return Response.json({ error: 'Please log in.' }, { status: 401, headers });
    const record = await readAccountTraining(session.user.id);
    return Response.json({ record }, { headers });
  } catch { return Response.json({ error: 'Account sync is unavailable.' }, { status: 503, headers }); }
}
export async function PUT(request: Request) {
  // Cookie-authenticated writes require a same-origin request. API responses
  // and authenticated database records are never cached by the service worker.
  if (request.headers.get('origin') !== new URL(request.url).origin) return Response.json({ error: 'Invalid origin.' }, { status: 403, headers });
  try {
    const auth = getNeonAuth();
    if (!auth) return Response.json({ error: 'Accounts are not configured.' }, { status: 503, headers });
    const { data: session, error } = await auth.getSession();
    if (error || !session?.user) return Response.json({ error: 'Please log in.' }, { status: 401, headers });
    if (!request.headers.get('content-type')?.startsWith('application/json')) return Response.json({ error: 'Use JSON.' }, { status: 415, headers });
    const raw = await request.text();
    if (new TextEncoder().encode(raw).byteLength > 5_000_000) return Response.json({ error: 'Training record is too large.' }, { status: 413, headers });
    let data, revision;
    try {
      const body = JSON.parse(raw);
      if (!Number.isSafeInteger(body.revision) || body.revision < 0) throw new Error('Invalid revision');
      data = parseTraining(body.data); revision = body.revision as number;
    } catch { return Response.json({ error: 'Invalid training record.' }, { status: 400, headers }); }
    const next = await writeAccountTraining(session.user.id, data, revision);
    if (!next) return Response.json({ error: 'Your account changed on another device.' }, { status: 409, headers });
    return Response.json({ revision: next }, { headers });
  } catch { return Response.json({ error: 'Account sync is unavailable.' }, { status: 503, headers }); }
}
