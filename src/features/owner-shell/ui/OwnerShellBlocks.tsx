import type { OwnerTenantContext } from '@/entities/hostel-owner';
import type { TenantLifecycleStatus } from '@/entities/tenant/lib/resolveTenantLifecycle';
import { toDateInputValue } from '@/entities/tenant/lib/resolveTenantLifecycle';
import { cn } from '@/shared/lib/utils';
import { getTranslations } from 'next-intl/server';

interface OwnerLifecycleBannerProps {
  status: TenantLifecycleStatus;
}

export async function OwnerLifecycleBanner({ status }: OwnerLifecycleBannerProps) {
  if (status === 'active') {
    return null;
  }

  const t = await getTranslations('pages.owner.lifecycle');

  const copyKey = status === 'expired' ? 'expired' : status === 'scheduled' ? 'scheduled' : 'archived';

  const tone =
    status === 'archived'
      ? 'border-destructive/40 bg-destructive/5 text-destructive'
      : 'border-amber-300 bg-amber-50 text-amber-950';

  return (
    <div className={cn('rounded-lg border px-4 py-3 text-sm', tone)} role="status">
      <p className="font-medium">{t(`${copyKey}.title`)}</p>
      <p className="mt-1 opacity-90">{t(`${copyKey}.description`)}</p>
    </div>
  );
}

interface OwnerSubscriptionReadOnlyProps {
  context: Pick<OwnerTenantContext, 'subscriptionStartsAt' | 'subscriptionEndsAt'>;
}

export async function OwnerSubscriptionReadOnly({ context }: OwnerSubscriptionReadOnlyProps) {
  const t = await getTranslations('pages.owner.subscription');

  const starts = toDateInputValue(context.subscriptionStartsAt);
  const ends = toDateInputValue(context.subscriptionEndsAt);

  return (
    <section className="rounded-xl border bg-background p-4 text-sm" aria-labelledby="owner-subscription-title">
      <h2 id="owner-subscription-title" className="font-medium">
        {t('title')}
      </h2>
      <p className="mt-1 text-xs text-muted-foreground">{t('readOnlyHint')}</p>
      <dl className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <dt className="text-xs text-muted-foreground">{t('starts')}</dt>
          <dd className="font-mono text-sm">{starts || '—'}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">{t('ends')}</dt>
          <dd className="font-mono text-sm">{ends || '—'}</dd>
        </div>
      </dl>
    </section>
  );
}
