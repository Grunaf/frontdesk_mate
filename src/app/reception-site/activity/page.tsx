import { redirect } from 'next/navigation';
import { getTenantRecord, resolveTenantSlug } from '@/entities/tenant/server';
import { listReceptionAuditEvents } from '@/entities/reception-audit/server';
import { isReceptionAuthenticated } from '@/app/reception/lib/receptionSession';
import { ReceptionActivityPanel } from '@/features/reception-activity';
import { ReceptionUnknownHostelContent } from '@/views/reception/ui/ReceptionUnknownHostelContent';

export default async function ReceptionActivityPage() {
  const tenantSlug = await resolveTenantSlug();
  if (!tenantSlug) {
    return (
      <div className="mx-auto max-w-md space-y-3 py-12 text-center">
        <h1 className="text-lg font-semibold">Activity</h1>
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

  const { events, error } = await listReceptionAuditEvents(tenant.id);

  return (
    <div className="mx-auto max-w-3xl py-8">
      <ReceptionActivityPanel events={events} error={error} />
    </div>
  );
}
