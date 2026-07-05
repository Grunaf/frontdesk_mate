import type { TenantAuditEventAdminRow } from '@/entities/tenant-audit/server/listTenantAuditEventsForAdmin';

type TenantOwnerActivityPanelProps = {
  events: TenantAuditEventAdminRow[];
  error: string | null;
};

function formatTime(iso: string): string {
  try {
    return new Intl.DateTimeFormat('en-GB', {
      dateStyle: 'short',
      timeStyle: 'short',
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function actorLabel(kind: TenantAuditEventAdminRow['actorKind']): string {
  return kind === 'owner' ? 'Owner' : 'Platform';
}

export function TenantOwnerActivityPanel({ events, error }: TenantOwnerActivityPanelProps) {
  return (
    <section className="rounded-xl border bg-background p-4 space-y-3">
      <div>
        <h3 className="text-sm font-semibold">Owner activity</h3>
        <p className="text-xs text-muted-foreground">
          Recent settings saves from the owner dashboard and from platform edits on this tenant.
        </p>
      </div>

      {error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900">{error}</p>
      ) : null}

      {events.length === 0 && !error ? (
        <p className="text-sm text-muted-foreground">No owner saves logged yet.</p>
      ) : null}

      {events.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[480px] text-left text-sm">
            <thead>
              <tr className="border-b text-xs text-muted-foreground">
                <th className="py-2 pr-4 font-medium">Time</th>
                <th className="py-2 pr-4 font-medium">Actor</th>
                <th className="py-2 pr-4 font-medium">Changed keys</th>
                <th className="py-2 font-medium">Flags</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {events.map((event) => (
                <tr key={event.id}>
                  <td className="py-2 pr-4 whitespace-nowrap text-xs">{formatTime(event.createdAt)}</td>
                  <td className="py-2 pr-4">{actorLabel(event.actorKind)}</td>
                  <td className="py-2 pr-4 text-xs text-muted-foreground">
                    {event.changedKeys.length > 0 ? event.changedKeys.join(', ') : '—'}
                  </td>
                  <td className="py-2">
                    <div className="flex flex-wrap gap-1">
                      {event.flags.deskPinChanged ? (
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-900">
                          deskPinChanged
                        </span>
                      ) : null}
                      {event.flags.nameChanged ? (
                        <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-medium text-blue-900">
                          nameChanged
                        </span>
                      ) : null}
                      {!event.flags.deskPinChanged && !event.flags.nameChanged ? (
                        <span className="text-xs text-muted-foreground">—</span>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </section>
  );
}
