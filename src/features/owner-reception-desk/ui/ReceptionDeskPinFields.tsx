'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { isDeskPinConfigured } from '@/app/reception/lib/deskPin';
import { AdminField, adminFieldWidthClass } from '@/app/admin/(protected)/tenants/ui/AdminField';
import { getTenantPublicUrl } from '@/shared/config';
import { cn } from '@/shared/lib/utils';

export type ReceptionDeskPinSurface = 'platform' | 'owner';

interface ReceptionDeskPinFieldsProps {
  surface?: ReceptionDeskPinSurface;
  tenantSlug: string;
  locale?: string;
  deskPinHash?: string;
  disabled?: boolean;
}

function PinStatusBadge({ configured, labels }: { configured: boolean; labels: { set: string; notSet: string } }) {
  return (
    <span
      className={cn(
        'inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium',
        configured
          ? 'bg-green-100 text-green-900 dark:bg-green-950/50 dark:text-green-200'
          : 'bg-amber-100 text-amber-900 dark:bg-amber-950/50 dark:text-amber-200'
      )}
    >
      {configured ? labels.set : labels.notSet}
    </span>
  );
}

export function ReceptionDeskPinFields({
  surface = 'platform',
  tenantSlug,
  locale = 'en',
  deskPinHash,
  disabled = false,
}: ReceptionDeskPinFieldsProps) {
  const t = useTranslations('pages.owner.receptionDesk');
  const configured = isDeskPinConfigured(deskPinHash);
  const receptionLoginUrl = getTenantPublicUrl(tenantSlug, 'reception', locale, '/login');

  if (surface === 'owner') {
    return (
      <div className="space-y-3 rounded-lg border bg-muted/10 px-4 py-3">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-medium">{t('title')}</p>
          <PinStatusBadge
            configured={configured}
            labels={{ set: t('statusSet'), notSet: t('statusNotSet') }}
          />
        </div>
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
        <label className="block space-y-1.5">
          <span className="text-sm font-medium">{t('pinLabel')}</span>
          <span className="block text-xs text-muted-foreground">{t('pinHint')}</span>
          <input
            name="receptionDeskPin"
            type="password"
            autoComplete="new-password"
            disabled={disabled}
            placeholder={configured ? t('pinPlaceholderUnchanged') : t('pinPlaceholderNew')}
            className={cn(
              'rounded-md border bg-background px-3 py-2 text-sm',
              adminFieldWidthClass('sm')
            )}
          />
        </label>
      </div>
    );
  }

  return (
    <AdminField
      label="Reception desk PIN"
      name="receptionDeskPin"
      type="password"
      placeholder={configured ? '•••••• (unchanged)' : 'Set PIN for reception desk'}
      hint={`Used at ${tenantSlug}.reception.domain. At least 6 characters when changing. Leave blank to keep the current PIN.`}
      width="sm"
    />
  );
}

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
