import type { TenantRecord } from '@/entities/tenant';
import {
  resolveAdminFormLifecycleStatus,
  toDateInputValue,
} from '@/entities/tenant/lib/resolveTenantLifecycle';
import { AdminField } from '../ui/AdminField';

interface SubscriptionFieldsProps {
  subscriptionStartsAt: string;
  subscriptionEndsAt: string;
  onChange: (patch: Partial<{ subscriptionStartsAt: string; subscriptionEndsAt: string }>) => void;
}

export function SubscriptionFields({
  subscriptionStartsAt,
  subscriptionEndsAt,
  onChange,
}: SubscriptionFieldsProps) {
  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">
        Subscription period controls when guests can open the landing and app. Archive or restore from the
        command bar above — it applies immediately after you confirm.
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        <AdminField
          label="Subscription starts"
          name="subscriptionStartsAt"
          type="date"
          value={subscriptionStartsAt}
          onChange={(value) => onChange({ subscriptionStartsAt: value })}
        />
        <AdminField
          label="Subscription ends"
          name="subscriptionEndsAt"
          type="date"
          value={subscriptionEndsAt}
          onChange={(value) => onChange({ subscriptionEndsAt: value })}
        />
      </div>
    </div>
  );
}

export function buildSubscriptionDefaults(tenant?: TenantRecord | null): {
  subscriptionStartsAt: string;
  subscriptionEndsAt: string;
  archived: boolean;
} {
  if (tenant) {
    return {
      subscriptionStartsAt: toDateInputValue(tenant.subscription_starts_at),
      subscriptionEndsAt: toDateInputValue(tenant.subscription_ends_at),
      archived: Boolean(tenant.archived_at),
    };
  }

  const starts = new Date();
  const ends = new Date(starts);
  ends.setFullYear(ends.getFullYear() + 1);

  return {
    subscriptionStartsAt: toDateInputValue(starts.toISOString()),
    subscriptionEndsAt: toDateInputValue(ends.toISOString()),
    archived: false,
  };
}

export function resolveSubscriptionLifecycleStatus(input: {
  archived: boolean;
  subscriptionStartsAt: string;
  subscriptionEndsAt: string;
}) {
  return resolveAdminFormLifecycleStatus(input);
}
