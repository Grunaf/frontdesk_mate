import { redirect } from 'next/navigation';
import { getTenantRecord, resolveTenantSlug } from '@/entities/tenant/server';
import { isReceptionAuthenticated } from '@/app/reception/lib/receptionSession';
import { sanitizeReceptionLoginNext } from '@/app/reception/lib/sanitizeReceptionLoginNext';
import { ReceptionCheckInPanel } from '@/features/guest-registration';
import { buildReceptionOperationalContext } from '@/features/reception-sync/server';
import { ReceptionUnknownHostelContent } from '@/views/reception/ui/ReceptionUnknownHostelContent';

type SearchParams = Record<string, string | string[] | undefined>;

function buildDeskNextPath(searchParams: SearchParams): string {
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(searchParams)) {
    if (typeof value === 'string') {
      qs.set(key, value);
    } else if (Array.isArray(value)) {
      for (const entry of value) {
        qs.append(key, entry);
      }
    }
  }
  const query = qs.toString();
  return query ? `/?${query}` : '/';
}

interface ReceptionDeskPageProps {
  searchParams: Promise<SearchParams>;
}

export default async function ReceptionDeskPage({ searchParams }: ReceptionDeskPageProps) {
  const tenantSlug = await resolveTenantSlug();
  if (!tenantSlug) {
    return (
      <div className="mx-auto max-w-md space-y-3 py-12 text-center">
        <h1 className="text-lg font-semibold">Reception desk</h1>
        <p className="text-sm text-muted-foreground">
          Open your hostel reception URL — it looks like{' '}
          <code className="text-xs">yourhostel.reception.domain</code>.
        </p>
      </div>
    );
  }

  if (!(await isReceptionAuthenticated(tenantSlug))) {
    const params = await searchParams;
    const next = sanitizeReceptionLoginNext(buildDeskNextPath(params));
    if (next && next !== '/') {
      redirect(`/login?next=${encodeURIComponent(next)}`);
    }
    redirect('/login');
  }

  const tenant = await getTenantRecord(tenantSlug);
  if (!tenant) {
    return <ReceptionUnknownHostelContent />;
  }

  const initialContext = await buildReceptionOperationalContext(tenantSlug);

  return (
    <ReceptionCheckInPanel
      tenantSlug={tenantSlug}
      tenantName={tenant.name}
      settings={tenant.settings}
      initialContext={initialContext}
    />
  );
}
