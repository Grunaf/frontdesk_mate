import Link from 'next/link';
import { getTenantsForAdmin } from '../../actions';
import {
  resolveTenantLifecycleStatus,
  toDateInputValue,
} from '@/entities/tenant/lib/resolveTenantLifecycle';
import { listTenantIdsWithOwnerForAdmin } from '@/entities/hostel-owner/server/getTenantOwnerForAdmin';

function OwnerBadge() {
  return (
    <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-medium text-violet-900">
      Owner
    </span>
  );
}

function TenantStatusBadge({
  status,
}: {
  status: ReturnType<typeof resolveTenantLifecycleStatus>;
}) {
  const labels = {
    active: 'Active',
    expired: 'Expired',
    archived: 'Archived',
    scheduled: 'Scheduled',
  } as const;

  const classes = {
    active: 'bg-green-100 text-green-800',
    expired: 'bg-amber-100 text-amber-900',
    archived: 'bg-muted text-muted-foreground',
    scheduled: 'bg-blue-100 text-blue-900',
  } as const;

  return (
    <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${classes[status]}`}>
      {labels[status]}
    </span>
  );
}

export default async function AdminTenantsPage() {
  const [{ tenants, error }, tenantIdsWithOwner] = await Promise.all([
    getTenantsForAdmin(),
    listTenantIdsWithOwnerForAdmin(),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold">Tenants</h2>
          <p className="text-sm text-muted-foreground">
            Per-hostel settings with subscription period. Expired or archived tenants stay editable but
            disappear from guest URLs.
          </p>
        </div>
        <Link
          href="/admin/tenants/new/settings/identity"
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
        >
          New tenant
        </Link>
      </div>

      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
          Database error: {error}.{' '}
          {error.includes('subscription_') || error.includes('archived_at') ? (
            <>
              Apply pending migrations:{' '}
              <code className="text-xs">npm run db:migrate</code> (needs{' '}
              <code className="text-xs">017_tenant_subscription.sql</code>).
            </>
          ) : (
            <>
              Check Supabase connection and run <code className="text-xs">npm run db:migrate</code>.
            </>
          )}
        </p>
      )}

      <ul className="divide-y rounded-xl border bg-background">
        {tenants.length === 0 && !error && (
          <li className="p-4 text-sm text-muted-foreground">
            No tenants in database yet. Run <code className="rounded bg-muted px-1">npm run db:migrate</code>{' '}
            (or start dev with <code className="rounded bg-muted px-1">DATABASE_URL</code> in .env.local), or create
            one below.
          </li>
        )}
        {tenants.map((tenant) => {
          const status = resolveTenantLifecycleStatus(tenant);

          return (
            <li key={tenant.id}>
              <Link
                href={`/admin/tenants/${tenant.slug}/settings/identity`}
                className="flex items-center justify-between gap-4 p-4 hover:bg-muted/40"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium">{tenant.name}</p>
                    <TenantStatusBadge status={status} />
                    {tenantIdsWithOwner.has(tenant.id) ? <OwnerBadge /> : null}
                  </div>
                  <p className="text-xs text-muted-foreground">{tenant.slug}</p>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    {toDateInputValue(tenant.subscription_starts_at) || '—'} →{' '}
                    {toDateInputValue(tenant.subscription_ends_at) || '—'}
                  </p>
                </div>
                <span className="shrink-0 text-xs text-muted-foreground">{tenant.city_pack_id}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
