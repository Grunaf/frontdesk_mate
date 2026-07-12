import { redirect } from 'next/navigation';
import { getTenantRecord, resolveTenantSlug } from '@/entities/tenant/server';
import { isReceptionAuthenticated } from '@/app/reception/lib/receptionSession';
import { listActiveGuestStays } from '@/entities/guest-stay/server';
import { listGuestIssues } from '@/entities/guest-issue/server';
import { listGuestHubTransfers } from '@/entities/guest-hub-transfer/server';
import { ReceptionCheckInPanel } from '@/features/guest-registration';
import { ReceptionUnknownHostelContent } from '@/views/reception/ui/ReceptionUnknownHostelContent';

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
    return <ReceptionUnknownHostelContent />;
  }

  const stays = await listActiveGuestStays(tenantSlug);
  const openIssues = await listGuestIssues(tenantSlug, 'open');
  const openTransfers = await listGuestHubTransfers(tenantSlug, 'open');

  return (
    <ReceptionCheckInPanel
      tenantSlug={tenantSlug}
      tenantName={tenant.name}
      settings={tenant.settings}
      initialStays={stays}
      initialOpenIssues={openIssues}
      initialOpenTransfers={openTransfers}
    />
  );
}
