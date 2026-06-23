import { redirect } from 'next/navigation';
import { notFound } from 'next/navigation';
import { getTenantRecord, resolveTenantSlug } from '@/entities/tenant/server';
import { isReceptionAuthenticated } from '@/app/reception/lib/receptionSession';
import { listActiveGuestStays } from '@/entities/guest-stay/server';
import { ReceptionCheckInPanel } from '@/features/guest-registration';

export default async function ReceptionDeskPage() {
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
    redirect('/login');
  }

  const tenant = await getTenantRecord(tenantSlug);
  if (!tenant) {
    notFound();
  }

  const stays = await listActiveGuestStays(tenantSlug);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Guest check-in</p>
          <h1 className="text-xl font-semibold">{tenant.name}</h1>
        </div>
        <form method="POST" action="/api/reception/logout">
          <button type="submit" className="text-sm text-muted-foreground hover:text-foreground">
            Sign out
          </button>
        </form>
      </div>
      <ReceptionCheckInPanel tenantSlug={tenantSlug} settings={tenant.settings} initialStays={stays} />
    </div>
  );
}
