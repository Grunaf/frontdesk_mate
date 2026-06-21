import Link from 'next/link';
import { listCityPacksForAdmin } from '@/entities/city-pack/server';
import { MIN_PLACES_FOR_PACK } from '@/entities/city-pack';

function StatusBadge({ status }: { status: 'draft' | 'ready' }) {
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
        status === 'ready' ? 'bg-green-100 text-green-800' : 'bg-muted text-muted-foreground'
      }`}
    >
      {status === 'ready' ? 'Ready' : 'Draft'}
    </span>
  );
}

export default async function AdminCityPacksPage() {
  const { packs, error } = await listCityPacksForAdmin();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold">City packs</h2>
          <p className="text-sm text-muted-foreground">
            Shared routes and local guide content. Tenants only see packs marked Ready with at least{' '}
            {MIN_PLACES_FOR_PACK} places.
          </p>
        </div>
        <Link
          href="/admin/city-packs/new"
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
        >
          New city pack
        </Link>
      </div>

      {error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
          Database error: {error}
        </p>
      ) : null}

      <ul className="divide-y rounded-xl border bg-background">
        {packs.length === 0 && !error ? (
          <li className="p-4 text-sm text-muted-foreground">No city packs yet.</li>
        ) : null}
        {packs.map((pack) => (
          <li key={pack.id}>
            <Link
              href={`/admin/city-packs/${pack.id}`}
              className="flex items-center justify-between gap-4 p-4 hover:bg-muted/40"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium">{pack.label}</p>
                  <StatusBadge status={pack.status} />
                </div>
                <p className="text-xs text-muted-foreground">{pack.id}</p>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {pack.placesCount} places · routes {pack.routesGateMet ? '✓' : '—'} ·{' '}
                  {pack.tenantCount} tenant{pack.tenantCount === 1 ? '' : 's'}
                </p>
              </div>
              <span className="shrink-0 text-xs text-muted-foreground">
                {pack.readyForTenants ? 'Ready ✓' : pack.notReadyReason ?? 'Not ready'}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
