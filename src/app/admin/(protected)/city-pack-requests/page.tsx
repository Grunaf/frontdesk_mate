import Link from 'next/link';
import type { CityPackRequestAdminFilter } from '@/features/city-pack-request/server/listCityPackRequestsForAdmin';
import {
  listCityPackRequestsForAdmin,
} from '@/features/city-pack-request/server/listCityPackRequestsForAdmin';
import { updateCityPackRequestStatusAction } from '@/features/city-pack-request/api/updateCityPackRequestStatusAction';
import type { CityPackRequestKind, CityPackRequestStatus } from '@/entities/city-pack-request';

const FILTER_TABS: { id: CityPackRequestAdminFilter; label: string }[] = [
  { id: 'pending', label: 'Pending' },
  { id: 'all', label: 'All' },
  { id: 'fulfilled', label: 'Fulfilled' },
  { id: 'dismissed', label: 'Dismissed' },
];

const KIND_LABELS: Record<CityPackRequestKind, string> = {
  new_city: 'New city',
  pack_not_ready: 'Pack not ready',
  other: 'Other',
};

function StatusBadge({ status }: { status: CityPackRequestStatus }) {
  const classes: Record<CityPackRequestStatus, string> = {
    pending: 'bg-amber-100 text-amber-900',
    reviewed: 'bg-blue-100 text-blue-900',
    fulfilled: 'bg-green-100 text-green-800',
    dismissed: 'bg-muted text-muted-foreground',
  };

  const labels: Record<CityPackRequestStatus, string> = {
    pending: 'Pending',
    reviewed: 'Reviewed',
    fulfilled: 'Fulfilled',
    dismissed: 'Dismissed',
  };

  return (
    <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${classes[status]}`}>
      {labels[status]}
    </span>
  );
}

function formatCreatedAt(iso: string): string {
  try {
    return new Intl.DateTimeFormat('en-GB', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

interface AdminCityPackRequestsPageProps {
  searchParams: Promise<{ filter?: string }>;
}

export default async function AdminCityPackRequestsPage({ searchParams }: AdminCityPackRequestsPageProps) {
  const { filter: filterRaw } = await searchParams;
  const filter: CityPackRequestAdminFilter =
    filterRaw === 'all' || filterRaw === 'fulfilled' || filterRaw === 'dismissed'
      ? filterRaw
      : 'pending';

  const { rows, error } = await listCityPackRequestsForAdmin(filter);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">City pack requests</h2>
        <p className="text-sm text-muted-foreground">
          Owner self-service queue. Fulfill by authoring a pack in City packs and assigning it on the tenant
          form — no auto-provisioning here.
        </p>
      </div>

      <nav className="flex flex-wrap gap-2">
        {FILTER_TABS.map((tab) => {
          const active = filter === tab.id;
          return (
            <Link
              key={tab.id}
              href={tab.id === 'pending' ? '/admin/city-pack-requests' : `/admin/city-pack-requests?filter=${tab.id}`}
              className={`rounded-md px-3 py-1.5 text-sm ${
                active
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab.label}
            </Link>
          );
        })}
      </nav>

      {error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
          Database error: {error}
        </p>
      ) : null}

      <ul className="divide-y rounded-xl border bg-background">
        {rows.length === 0 && !error ? (
          <li className="p-4 text-sm text-muted-foreground">No requests in this view.</li>
        ) : null}
        {rows.map((row) => (
          <li key={row.id} className="space-y-3 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium">
                    {row.cityName}
                    {row.countryOrRegion ? ` · ${row.countryOrRegion}` : ''}
                  </p>
                  <StatusBadge status={row.status} />
                  <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                    {KIND_LABELS[row.kind]}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">{formatCreatedAt(row.createdAt)}</p>
                {row.message ? (
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{row.message}</p>
                ) : null}
              </div>
              <div className="shrink-0 text-right text-xs text-muted-foreground space-y-1">
                {row.contactEmail ? <p>{row.contactEmail}</p> : <p>—</p>}
                {row.tenantSlug ? (
                  <Link href={`/admin/tenants/${row.tenantSlug}/settings/identity`} className="text-primary hover:underline">
                    {row.tenantSlug}
                  </Link>
                ) : (
                  <p>No tenant linked</p>
                )}
                {row.relatedCityPackId ? <p>Pack: {row.relatedCityPackId}</p> : null}
              </div>
            </div>

            {(row.status === 'pending' || row.status === 'reviewed') && (
              <div className="flex flex-wrap gap-2">
                {row.status === 'pending' ? (
                  <form action={updateCityPackRequestStatusAction}>
                    <input type="hidden" name="requestId" value={row.id} />
                    <input type="hidden" name="status" value="reviewed" />
                    <button
                      type="submit"
                      className="rounded-md border px-3 py-1.5 text-xs font-medium hover:bg-muted/60"
                    >
                      Mark reviewed
                    </button>
                  </form>
                ) : null}
                <form action={updateCityPackRequestStatusAction}>
                  <input type="hidden" name="requestId" value={row.id} />
                  <input type="hidden" name="status" value="fulfilled" />
                  <button
                    type="submit"
                    className="rounded-md border border-green-200 bg-green-50 px-3 py-1.5 text-xs font-medium text-green-900 hover:bg-green-100"
                  >
                    Fulfilled
                  </button>
                </form>
                <form action={updateCityPackRequestStatusAction}>
                  <input type="hidden" name="requestId" value={row.id} />
                  <input type="hidden" name="status" value="dismissed" />
                  <button
                    type="submit"
                    className="rounded-md border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted/60"
                  >
                    Dismiss
                  </button>
                </form>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
