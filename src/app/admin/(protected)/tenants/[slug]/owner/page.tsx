import { redirect } from 'next/navigation';
import { getTenantOwnerForAdmin } from '@/entities/hostel-owner/server/getTenantOwnerForAdmin';
import { getTenantRecord } from '@/entities/tenant/server';
import { listTenantAuditEventsForAdmin } from '@/entities/tenant-audit/server/listTenantAuditEventsForAdmin';
import { TenantOwnerOpsView } from '@/features/platform-tenant-ops';

interface AdminTenantOwnerPageProps {
  params: Promise<{ slug: string }>;
}

export default async function AdminTenantOwnerPage({ params }: AdminTenantOwnerPageProps) {
  const { slug } = await params;

  if (slug === 'new') {
    redirect('/admin/tenants/new');
  }

  const tenant = await getTenantRecord(slug);

  if (!tenant) {
    return (
      <div className="mx-auto max-w-6xl space-y-4">
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Tenant not found.
        </p>
      </div>
    );
  }

  const [owner, audit] = await Promise.all([
    getTenantOwnerForAdmin(tenant.id),
    listTenantAuditEventsForAdmin(tenant.id),
  ]);

  return (
    <TenantOwnerOpsView
      tenantId={tenant.id}
      tenantSlug={tenant.slug}
      tenantName={tenant.name}
      owner={owner}
      events={audit.events}
      auditError={audit.error}
    />
  );
}
