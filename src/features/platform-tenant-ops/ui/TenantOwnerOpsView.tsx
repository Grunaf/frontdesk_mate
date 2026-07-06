import Link from 'next/link';
import type { TenantOwnerForAdmin } from '@/entities/hostel-owner/server/getTenantOwnerForAdmin';
import type { TenantAuditEventAdminRow } from '@/entities/tenant-audit/server/listTenantAuditEventsForAdmin';
import { TenantOwnerActivityPanel } from './TenantOwnerActivityPanel';
import { TenantOwnerPanel } from './TenantOwnerPanel';

type TenantOwnerOpsViewProps = {
  tenantId: string;
  tenantSlug: string;
  tenantName: string;
  owner: TenantOwnerForAdmin | null;
  events: TenantAuditEventAdminRow[];
  auditError: string | null;
};

export function TenantOwnerOpsView({
  tenantId,
  tenantSlug,
  tenantName,
  owner,
  events,
  auditError,
}: TenantOwnerOpsViewProps) {
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="space-y-2">
        <Link
          href={`/admin/tenants/${tenantSlug}/settings/identity`}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Back to settings
        </Link>
        <div>
          <h2 className="text-xl font-semibold">Owner — {tenantName}</h2>
          <p className="text-sm text-muted-foreground">
            Self-service account and recent settings saves. Subscription and city pack stay on the tenant
            settings form.
          </p>
        </div>
      </div>

      <TenantOwnerPanel tenantId={tenantId} tenantSlug={tenantSlug} owner={owner} />
      <TenantOwnerActivityPanel events={events} error={auditError} />
    </div>
  );
}
