import { getTranslations } from 'next-intl/server';
import { redirect } from 'next/navigation';

import { getOwnerTenantContext } from '@/entities/hostel-owner';
import { resolveOwnerEditAccess } from '@/entities/hostel-owner/lib/resolveOwnerEditAccess';
import {
  normalizePropertyTimeZone,
  todayPropertyStayCalendarDay,
} from '@/entities/guest-stay';
import { getTenantRecord } from '@/entities/tenant/server';
import {
  listActiveVolunteers,
  listVolunteerShiftsForWeek,
} from '@/entities/volunteer/server';
import { startOfIsoWeekCalendarDay } from '@/entities/volunteer';
import {
  VolunteerSchedulePanel,
  type VolunteerSchedulePanelLabels,
} from '@/features/owner-volunteer-schedule';
import { getOwnerDashboardFrameClasses } from '@/features/owner-shell';

interface OwnerSchedulePageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ week?: string }>;
}

export default async function OwnerSchedulePage({
  params,
  searchParams,
}: OwnerSchedulePageProps) {
  const { locale } = await params;
  const { week: weekParam } = await searchParams;
  const t = await getTranslations('pages.owner.schedule');
  const context = await getOwnerTenantContext();

  if (!context) {
    redirect(`/${locale}/onboarding`);
  }

  const tenant = await getTenantRecord(context.slug);
  if (!tenant) {
    redirect(`/${locale}/onboarding`);
  }

  const propertyTimeZone = normalizePropertyTimeZone(tenant.settings.propertyTimeZone);
  const today = todayPropertyStayCalendarDay(new Date(), propertyTimeZone);
  const weekStart =
    startOfIsoWeekCalendarDay(weekParam?.trim() || today) ??
    startOfIsoWeekCalendarDay(today) ??
    today;

  const [volunteers, shifts] = await Promise.all([
    listActiveVolunteers(context.slug, locale),
    listVolunteerShiftsForWeek({
      tenantSlug: context.slug,
      weekStartMonday: weekStart,
    }),
  ]);

  const canEdit = resolveOwnerEditAccess(context.lifecycleStatus).canEditSettings;
  const errorLabels = {
    unauthorized: t('errors.unauthorized'),
    forbidden: t('errors.forbidden'),
    tenant_not_found: t('errors.tenant_not_found'),
    not_found: t('errors.not_found'),
    archived: t('errors.archived'),
    invalid_range: t('errors.invalid_range'),
    invalid_target: t('errors.invalid_target'),
    db_unavailable: t('errors.db_unavailable'),
    unknown: t('errors.unknown'),
  };

  const labels: VolunteerSchedulePanelLabels = {
    title: t('title'),
    subtitle: t('subtitle'),
    emptyVolunteers: t('emptyVolunteers'),
    weekLabel: t('weekLabel'),
    prevWeek: t('prevWeek'),
    nextWeek: t('nextWeek'),
    thisWeek: t('thisWeek'),
    loadLabel: t('loadLabel'),
    targetLabel: t('targetLabel'),
    saveTarget: t('saveTarget'),
    emptyCell: t('emptyCell'),
    repeatDay: t('repeatDay'),
    periodHours: t('periodHours'),
    hoursUnit: t('hoursUnit'),
    day: {
      titleEdit: t('day.titleEdit'),
      titleCreate: t('day.titleCreate'),
      description: t('day.description'),
      volunteer: t('volunteer'),
      date: t('date'),
      start: t('start'),
      end: t('end'),
      save: t('day.save'),
      create: t('day.create'),
      remove: t('removeShift'),
      removeConfirm: t('removeConfirm'),
      errors: errorLabels,
    },
    repeat: {
      title: t('repeat.title'),
      description: t('repeat.description'),
      volunteer: t('volunteer'),
      start: t('start'),
      end: t('end'),
      from: t('repeat.from'),
      until: t('repeat.until'),
      weekdays: t('repeat.weekdays'),
      presetMonFri: t('repeat.presetMonFri'),
      presetAllWeek: t('repeat.presetAllWeek'),
      presetCustom: t('repeat.presetCustom'),
      weekdayLabels: {
        1: t('repeat.weekdayLabels.1'),
        2: t('repeat.weekdayLabels.2'),
        3: t('repeat.weekdayLabels.3'),
        4: t('repeat.weekdayLabels.4'),
        5: t('repeat.weekdayLabels.5'),
        6: t('repeat.weekdayLabels.6'),
        7: t('repeat.weekdayLabels.7'),
      },
      apply: t('repeat.apply'),
      overwrite: t('repeat.overwrite'),
      overwriteConfirm: t('repeat.overwriteConfirm'),
      errors: errorLabels,
    },
    errors: errorLabels,
  };

  const frame = getOwnerDashboardFrameClasses();

  return (
    <div className={frame.content}>
      <VolunteerSchedulePanel
        locale={locale}
        canEdit={canEdit}
        propertyTimeZone={propertyTimeZone}
        weekStartMonday={weekStart}
        volunteers={volunteers}
        shifts={shifts}
        labels={labels}
      />
    </div>
  );
}
