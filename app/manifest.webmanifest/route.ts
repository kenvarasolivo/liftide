import appManifest from '@/lib/app-manifest';
export const dynamic = 'force-static';
export function GET() {
  return Response.json(appManifest(), { headers: { 'Content-Type': 'application/manifest+json' } });
}
