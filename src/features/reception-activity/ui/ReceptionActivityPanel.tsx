import type { ReceptionAuditEventType } from '@/entities/reception-audit';
import {
  DEFAULT_RECEPTION_AUDIT_FORMAT_LABELS,
  formatReceptionAuditActor,
  formatReceptionAuditEventDetail,
  formatReceptionAuditEventLabel,
  formatReceptionAuditEventTime,
  type ReceptionAuditFormatLabels,
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

export type ReceptionActivityPanelLabels = {
  title: string;
  subtitle: string;
  empty: string;
  columnTime: string;
  columnStaff: string;
  columnEvent: string;
  columnDetail: string;
} & ReceptionAuditFormatLabels;

export const DEFAULT_RECEPTION_ACTIVITY_PANEL_LABELS: ReceptionActivityPanelLabels = {
  title: 'Activity',
  subtitle: 'Recent staff actions on this desk.',
  empty: 'No staff actions logged yet.',
  columnTime: 'Time',
  columnStaff: 'Staff',
  columnEvent: 'Event',
  columnDetail: 'Detail',
  ...DEFAULT_RECEPTION_AUDIT_FORMAT_LABELS,
};

type ReceptionActivityPanelProps = {
  events: ReceptionActivityEvent[];
  error: string | null;
  labels?: ReceptionActivityPanelLabels;
  timeLocale?: string;
};

export function ReceptionActivityPanel({
  events,
  error,
  labels = DEFAULT_RECEPTION_ACTIVITY_PANEL_LABELS,
  timeLocale = 'en-GB',
}: ReceptionActivityPanelProps) {
  return (
    <section className="rounded-xl border bg-background p-4 space-y-3">
      <div>
        <h1 className="text-lg font-semibold">{labels.title}</h1>
        <p className="text-sm text-muted-foreground">{labels.subtitle}</p>
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      {events.length === 0 && !error ? (
        <p className="text-sm text-muted-foreground">{labels.empty}</p>
      ) : null}

      {events.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] text-left text-sm">
            <thead>
              <tr className="border-b text-xs text-muted-foreground">
                <th className="py-2 pr-4 font-medium">{labels.columnTime}</th>
                <th className="py-2 pr-4 font-medium">{labels.columnStaff}</th>
                <th className="py-2 pr-4 font-medium">{labels.columnEvent}</th>
                <th className="py-2 font-medium">{labels.columnDetail}</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {events.map((event) => (
                <tr key={event.id}>
                  <td className="py-2 pr-4 whitespace-nowrap text-xs">
                    {formatReceptionAuditEventTime(event.createdAt, timeLocale)}
                  </td>
                  <td className="py-2 pr-4">
                    {formatReceptionAuditActor(event, {
                      formerStaff: labels.formerStaff,
                      emptyDetail: labels.emptyDetail,
                    })}
                  </td>
                  <td className="py-2 pr-4">
                    {formatReceptionAuditEventLabel(event.eventType, labels.eventTypes)}
                  </td>
                  <td className="py-2 text-xs text-muted-foreground">
                    {formatReceptionAuditEventDetail(event, labels.emptyDetail)}
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
