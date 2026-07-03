import { purgeExpiredTourismDocuments } from '@/features/guest-tourism-registration/jobs/purgeExpiredTourismDocuments';

export const runtime = 'nodejs';

function readCronSecretFromRequest(request: Request): string | null {
  const header = request.headers.get('authorization')?.trim();
  if (!header) return null;

  const match = /^Bearer\s+(.+)$/i.exec(header);
  return match?.[1]?.trim() ?? null;
}

export async function GET(request: Request) {
  const expectedSecret = process.env.CRON_SECRET?.trim();
  if (!expectedSecret) {
    console.error('[tourism-document-purge] CRON_SECRET is not configured');
    return Response.json({ ok: false, error: 'cron_not_configured' }, { status: 503 });
  }

  const providedSecret = readCronSecretFromRequest(request);
  if (!providedSecret || providedSecret !== expectedSecret) {
    return Response.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  try {
    const result = await purgeExpiredTourismDocuments();
    return Response.json({ ok: true, result });
  } catch (error) {
    console.error('[tourism-document-purge] job failed:', error);
    return Response.json({ ok: false, error: 'job_failed' }, { status: 500 });
  }
}
