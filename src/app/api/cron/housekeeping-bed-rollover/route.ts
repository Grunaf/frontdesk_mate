import { markCheckoutBedsNeedsStrip } from '@/features/guest-registration/jobs/markCheckoutBedsNeedsStrip';

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
    console.error('[housekeeping-bed-rollover] CRON_SECRET is not configured');
    return Response.json({ ok: false, error: 'cron_not_configured' }, { status: 503 });
  }

  const providedSecret = readCronSecretFromRequest(request);
  if (!providedSecret || providedSecret !== expectedSecret) {
    return Response.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  try {
    const result = await markCheckoutBedsNeedsStrip();
    return Response.json({ ok: true, result });
  } catch (error) {
    console.error('[housekeeping-bed-rollover] job failed:', error);
    return Response.json({ ok: false, error: 'job_failed' }, { status: 500 });
  }
}
