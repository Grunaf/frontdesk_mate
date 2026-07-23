import { getTranslations } from 'next-intl/server';
import { redirect } from 'next/navigation';

import { getOwnerTenantContext } from '@/entities/hostel-owner';
import { resolveOwnerEditAccess } from '@/entities/hostel-owner/lib/resolveOwnerEditAccess';
import { todayPropertyStayCalendarDay } from '@/entities/guest-stay';
import { listPlanGuestReservations } from '@/entities/guest-stay/server';
import { listActiveVolunteers } from '@/entities/volunteer/server';
import { getTenantRecord } from '@/entities/tenant/server';
import {
  listVolunteerBedsByRoom,
  VolunteersPanel,
  type VolunteersPanelLabels,
} from '@/features/owner-volunteers';
import { getOwnerDashboardFrameClasses } from '@/features/owner-shell';

interface OwnerVolunteersPageProps {
  params: Promise<{ locale: string }>;
}

export default async function OwnerVolunteersPage({ params }: OwnerVolunteersPageProps) {
  const { locale } = await params;
  const t = await getTranslations('pages.owner.volunteers');
  const context = await getOwnerTenantContext();

  if (!context) {
    redirect(`/${locale}/onboarding`);
  }

  const tenant = await getTenantRecord(context.slug);
  if (!tenant) {
    redirect(`/${locale}/onboarding`);
  }

  const [volunteers, planStays] = await Promise.all([
    listActiveVolunteers(context.slug, locale),
    listPlanGuestReservations(context.slug, locale),
  ]);

  const bedsByRoom = listVolunteerBedsByRoom(tenant.settings);
  const canEdit = resolveOwnerEditAccess(context.lifecycleStatus).canEditSettings;
  const operationalDate = todayPropertyStayCalendarDay(
    new Date(),
    tenant.settings.propertyTimeZone
  );

  const labels: VolunteersPanelLabels = {
    title: t('title'),
    subtitle: t('subtitle'),
    empty: t('empty'),
    addTitle: t('addTitle'),
    name: t('fields.name'),
    source: t('fields.source'),
    sourceDirect: t('sources.direct'),
    sourceWorldpacker: t('sources.worldpacker'),
    checkIn: t('fields.checkIn'),
    checkOut: t('fields.checkOut'),
    bed: t('fields.bed'),
    bedUnavailable: t('bedUnavailable'),
    submit: t('submit'),
    archive: t('archive'),
    archiveConfirm: t('archiveConfirm'),
    listTitle: t('listTitle'),
    openInPlan: t('openInPlan'),
    staffAccess: t('staffAccess'),
    setupAccessHint: t('setupAccessHint'),
    instructionsCopied: t('instructionsCopied'),
    instructionsCopyFailed: t('instructionsCopyFailed'),
    errors: {
      unauthorized: t('errors.unauthorized'),
      forbidden: t('errors.forbidden'),
      invalid_name: t('errors.invalid_name'),
      invalid_source: t('errors.invalid_source'),
      bed_not_found: t('errors.bed_not_found'),
      access_overlap: t('errors.access_overlap'),
      tenant_not_found: t('errors.tenant_not_found'),
      db_unavailable: t('errors.db_unavailable'),
      not_found: t('errors.not_found'),
      already_archived: t('errors.already_archived'),
      invalid_operational_day: t('errors.invalid_operational_day'),
      staff_limit_reached: t('errors.staff_limit_reached'),
      login_taken: t('errors.login_taken'),
      unknown: t('errors.unknown'),
    },
  };

  const frame = getOwnerDashboardFrameClasses();
  const staffAccessHref = `/${locale}/settings/contacts?module=reception-staff`;

  return (
    <div className={frame.content}>
      <VolunteersPanel
        locale={locale}
        tenantSlug={context.slug}
        canEdit={canEdit}
        volunteers={volunteers}
        planStays={planStays}
        bedsByRoom={bedsByRoom}
        operationalDate={operationalDate}
        staffAccessHref={staffAccessHref}
        labels={labels}
      />
    </div>
  );
}
