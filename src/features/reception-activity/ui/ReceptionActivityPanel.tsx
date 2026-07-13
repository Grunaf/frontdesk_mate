import type { ReceptionAuditEventType } from '@/entities/reception-audit';
import {
  formatReceptionAuditActor,
  formatReceptionAuditEventDetail,
  formatReceptionAuditEventLabel,
  formatReceptionAuditEventTime,
} from '../lib/formatReceptionAuditEvent';

export type ReceptionActivityEvent = {
  id: string;
  createdAt: string;
  actorReceptionUserId: string | null;
  actorLogin: string | null;
  actorDisplayName: string | null;
  eventType: ReceptionAuditEventType;
  subjectId: string | null;
  flags: { summary?: string };
};

type ReceptionActivityPanelProps = {
  events: ReceptionActivityEvent[];
  error: string | null;
};

export function ReceptionActivityPanel({ events, error }: ReceptionActivityPanelProps) {
  return (
    <section className="rounded-xl border bg-background p-4 space-y-3">
      <div>
        <h1 className="text-lg font-semibold">Activity</h1>
        <p className="text-sm text-muted-foreground">
          Recent staff actions on this desk.
        </p>
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      {events.length === 0 && !error ? (
        <p className="text-sm text-muted-foreground">No staff actions logged yet.</p>
      ) : null}

      {events.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] text-left text-sm">
            <thead>
              <tr className="border-b text-xs text-muted-foreground">
                <th className="py-2 pr-4 font-medium">Time</th>
                <th className="py-2 pr-4 font-medium">Staff</th>
                <th className="py-2 pr-4 font-medium">Event</th>
                <th className="py-2 font-medium">Detail</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {events.map((event) => (
                <tr key={event.id}>
                  <td className="py-2 pr-4 whitespace-nowrap text-xs">
                    {formatReceptionAuditEventTime(event.createdAt)}
                  </td>
                  <td className="py-2 pr-4">{formatReceptionAuditActor(event)}</td>
                  <td className="py-2 pr-4">{formatReceptionAuditEventLabel(event.eventType)}</td>
                  <td className="py-2 text-xs text-muted-foreground">
                    {formatReceptionAuditEventDetail(event)}
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
