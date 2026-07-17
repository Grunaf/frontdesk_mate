import { getTranslations } from 'next-intl/server';
import { redirect } from 'next/navigation';
import { getOwnerTenantContext } from '@/entities/hostel-owner';
import type { ReceptionAuditEventType } from '@/entities/reception-audit';
import { listReceptionAuditEvents } from '@/entities/reception-audit/server';
import { getTenantRecord } from '@/entities/tenant/server';
import {
  ReceptionActivityPanel,
  type ReceptionActivityPanelLabels,
} from '@/features/reception-activity';

interface OwnerActivityPageProps {
  params: Promise<{ locale: string }>;
}

function timeLocaleFor(locale: string): string {
  if (locale === 'ru') return 'ru-RU';
  if (locale === 'sr') return 'sr-RS';
  return 'en-GB';
}

export default async function OwnerActivityPage({ params }: OwnerActivityPageProps) {
  const { locale } = await params;
  const t = await getTranslations('pages.owner.activity');
  const context = await getOwnerTenantContext();

  if (!context) {
    redirect(`/${locale}/onboarding`);
  }

  const tenant = await getTenantRecord(context.slug);
  if (!tenant) {
    redirect(`/${locale}/onboarding`);
  }

  const { events, error } = await listReceptionAuditEvents(tenant.id);

  const eventTypeKeys: ReceptionAuditEventType[] = [
    'guest_stay_created',
    'guest_stay_updated',
    'guest_stay_revoked',
    'guest_stay_reissued',
    'desk_check_in_completed',
    'booking_paid_set',
    'hub_transfer_resolved',
  ];

  const labels: ReceptionActivityPanelLabels = {
    title: t('title'),
    subtitle: t('subtitle'),
    empty: t('empty'),
    columnTime: t('columns.time'),
    columnStaff: t('columns.staff'),
    columnEvent: t('columns.event'),
    columnDetail: t('columns.detail'),
    formerStaff: t('formerStaff'),
    emptyDetail: t('emptyDetail'),
    eventTypes: Object.fromEntries(
      eventTypeKeys.map((key) => [key, t(`eventTypes.${key}`)])
    ) as ReceptionActivityPanelLabels['eventTypes'],
  };

  return (
    <div className="mx-auto max-w-3xl">
      <ReceptionActivityPanel
        events={events}
        error={error}
        labels={labels}
        timeLocale={timeLocaleFor(locale)}
      />
    </div>
  );
}
