'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { getTenantPublicUrl } from '@/shared/config';

export type ReceptionDeskAccessSurface = 'platform' | 'owner';

interface ReceptionDeskAccessFieldsProps {
  surface?: ReceptionDeskAccessSurface;
  tenantSlug: string;
  locale?: string;
  disabled?: boolean;
}

/** @deprecated Use ReceptionDeskAccessFields */
export type ReceptionDeskPinSurface = ReceptionDeskAccessSurface;

export function ReceptionDeskAccessFields({
  surface = 'platform',
  tenantSlug,
  locale = 'en',
}: ReceptionDeskAccessFieldsProps) {
  const t = useTranslations('pages.owner.receptionDesk');

  if (surface !== 'owner') {
    return null;
  }

  const receptionLoginUrl = getTenantPublicUrl(tenantSlug, 'reception', locale, '/login');

  return (
    <div className="space-y-3 rounded-lg border bg-muted/10 px-4 py-3">
      <p className="text-sm font-medium">{t('title')}</p>
      <p className="text-xs text-muted-foreground">{t('description')}</p>
      <div className="space-y-1">
        <span className="text-xs font-medium text-muted-foreground">{t('loginUrlLabel')}</span>
        <p className="text-sm">
          <a
            href={receptionLoginUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            {receptionLoginUrl}
          </a>
        </p>
      </div>
    </div>
  );
}

/** @deprecated Prefer ReceptionDeskAccessFields */
export const ReceptionDeskPinFields = ReceptionDeskAccessFields;

export function OwnerLaunchReceptionPinHint({ locale }: { locale: string }) {
  const t = useTranslations('pages.owner.receptionDesk');
  return (
    <p className="mt-4 text-sm text-muted-foreground">
      {t('setupHint')}{' '}
      <Link
        href={`/${locale}/settings#contacts`}
        className="font-medium text-primary underline-offset-4 hover:underline"
      >
        {t('setupLink')}
      </Link>
    </p>
  );
}
