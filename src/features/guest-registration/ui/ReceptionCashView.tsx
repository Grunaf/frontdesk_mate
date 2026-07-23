'use client';

import type { ReceptionCashSnapshot } from '../lib/resolveReceptionCashSnapshot';
import { formatDisplayDate } from '../lib/guestAccessDates';
import { formatMoneyFromMinor } from '@/shared/lib/currency';
import { cn } from '@/shared/lib/utils';

type ReceptionCashViewProps = {
  snapshot: ReceptionCashSnapshot;
  resolveBedLabel: (bedId: string) => string;
  onViewStay: (stayId: string) => void;
};

function formatOperationalDayCaption(snapshot: ReceptionCashSnapshot): string {
  const { operationalDate } = snapshot.operational;
  return `Operational day · ${formatDisplayDate(operationalDate)} · starts ${snapshot.operationalDayStartTime}`;
}

function CashStat({
  label,
  value,
  emphasize,
}: {
  label: string;
  value: string;
  emphasize?: boolean;
}) {
  return (
    <div
      className={cn(
        'rounded-lg border px-3 py-2.5',
        emphasize ? 'border-primary/30 bg-primary/5' : 'bg-card'
      )}
    >
      <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 text-base font-semibold tabular-nums text-foreground">{value}</p>
    </div>
  );
}

export function ReceptionCashView({
  snapshot,
  resolveBedLabel,
  onViewStay,
}: ReceptionCashViewProps) {
  const locale = 'en';
  const money = (minor: number) =>
    formatMoneyFromMinor(minor, snapshot.currency, locale);

  return (
    <div className="space-y-5">
      <p className="text-xs text-muted-foreground">{formatOperationalDayCaption(snapshot)}</p>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <CashStat label="Collected today" value={money(snapshot.collectedMinor)} />
        <CashStat label="Still to collect" value={money(snapshot.stillDueMinor)} emphasize />
        <CashStat label="Expected total" value={money(snapshot.expectedTotalMinor)} />
      </div>

      <p className="text-xs text-muted-foreground">
        Paid today · {snapshot.paidTodayCount}
        <span className="mx-1.5 text-border">·</span>
        Unpaid · {snapshot.unpaidCount}
      </p>

      <section className="space-y-2">
        <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Still to collect
        </h3>
        {snapshot.stillToCollect.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            No unpaid balances for this operational night.
          </p>
        ) : (
          <ul className="space-y-1.5">
            {snapshot.stillToCollect.map((item) => {
              const guestLabel = item.stay.guest_name?.trim() || 'Guest';
              const bedLabel = resolveBedLabel(item.stay.bed_id);
              const amountLabel =
                item.hasPrice && item.amountMinor != null && item.currency
                  ? formatMoneyFromMinor(item.amountMinor, item.currency, locale)
                  : 'No price set';
              const statusLabel = item.admitted ? 'In-house' : 'Not admitted';

              return (
                <li key={item.stay.id}>
                  <button
                    type="button"
                    onClick={() => onViewStay(item.stay.id)}
                    className={cn(
                      'flex w-full items-center justify-between gap-3 rounded-lg border bg-card px-3 py-2 text-left text-sm',
                      'hover:bg-muted/40'
                    )}
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-medium">{guestLabel}</span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {bedLabel} · {statusLabel}
                      </span>
                    </span>
                    <span
                      className={cn(
                        'shrink-0 text-xs tabular-nums',
                        item.hasPrice ? 'font-medium text-foreground' : 'text-muted-foreground'
                      )}
                    >
                      {amountLabel}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {snapshot.collectedMinor === 0 &&
      snapshot.stillDueMinor === 0 &&
      snapshot.unpaidCount === 0 &&
      snapshot.paidTodayCount === 0 ? (
        <p className="text-xs text-muted-foreground">No balances for this operational day.</p>
      ) : null}
    </div>
  );
}