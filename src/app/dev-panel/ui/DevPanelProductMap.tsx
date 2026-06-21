import type { ProductMapEntry, ProductMapStatus } from '@/shared/config/product-map.types';
import productMap from '@/shared/config/product-map.json';

const ENTRIES = productMap as ProductMapEntry[];

const STATUS_LABEL: Record<ProductMapStatus, string> = {
  planned: 'Planned',
  implemented: 'Implemented',
  smoke_ok: 'Smoke OK',
  prod_ready: 'Prod ready',
};

function statusClass(status: ProductMapStatus): string {
  switch (status) {
    case 'prod_ready':
      return 'bg-emerald-100 text-emerald-900';
    case 'smoke_ok':
      return 'bg-sky-100 text-sky-900';
    case 'implemented':
      return 'bg-amber-100 text-amber-900';
    default:
      return 'bg-muted text-muted-foreground';
  }
}

export function DevPanelProductMap() {
  const byArea = ENTRIES.reduce<Record<string, ProductMapEntry[]>>((acc, entry) => {
    acc[entry.area] ??= [];
    acc[entry.area].push(entry);
    return acc;
  }, {});

  const smokeCount = ENTRIES.filter((e) => e.status === 'smoke_ok').length;

  return (
    <section className="space-y-3 rounded-xl border bg-background p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-sm font-semibold">Product map</h2>
        <p className="text-xs text-muted-foreground">
          {ENTRIES.length} use cases · {smokeCount} smoke_ok · edit{' '}
          <code className="rounded bg-muted px-1">src/shared/config/product-map.json</code>
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] border-collapse text-sm">
          <thead>
            <tr className="border-b text-left text-xs text-muted-foreground">
              <th className="py-2 pr-3 font-medium">Use case</th>
              <th className="py-2 pr-3 font-medium">Area</th>
              <th className="py-2 pr-3 font-medium">Status</th>
              <th className="py-2 font-medium">Smoke / notes</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(byArea).flatMap(([area, entries]) =>
              entries.map((entry) => (
                <tr key={entry.id} className="border-b border-muted/60">
                  <td className="py-2 pr-3 font-medium">{entry.useCase}</td>
                  <td className="py-2 pr-3 text-muted-foreground">{area}</td>
                  <td className="py-2 pr-3">
                    <span
                      className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${statusClass(entry.status)}`}
                    >
                      {STATUS_LABEL[entry.status]}
                    </span>
                  </td>
                  <td className="py-2 text-xs text-muted-foreground">
                    {entry.smokeSpec ? (
                      <code className="rounded bg-muted px-1">{entry.smokeSpec}</code>
                    ) : null}
                    {entry.notes ? (
                      <span className={entry.smokeSpec ? 'ml-1' : ''}>{entry.notes}</span>
                    ) : null}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
