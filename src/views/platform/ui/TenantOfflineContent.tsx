'use client';

import { useMemo } from 'react';
import type { TenantGuestShell } from '@/entities/tenant/model/guest-shell';
import type { TenantPublicSite } from '@/shared/config';
import { useTranslations } from '@/shared/i18n';
import { createWhatsappLink } from '@/shared/lib';
import { Button, ExternalServiceButton, Icon } from '@/shared/ui';
import { Phone } from 'lucide-react';
import { TenantDirectoryList, type TenantDirectoryEntry } from '@/views/platform/ui/TenantDirectoryList';

interface TenantOfflineContentProps {
  shell: TenantGuestShell;
  site: TenantPublicSite;
  locale: string;
  activeTenants?: TenantDirectoryEntry[];
}

function formatScheduledDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function resolveWhatsappMessageKey(
  lifecycleStatus: TenantGuestShell['lifecycleStatus']
): 'whatsappMessage' | 'whatsappMessageScheduled' | 'whatsappMessageArchived' {
  if (lifecycleStatus === 'scheduled') {
    return 'whatsappMessageScheduled';
  }

  if (lifecycleStatus === 'archived') {
    return 'whatsappMessageArchived';
  }

  return 'whatsappMessage';
}

export function TenantOfflineContent({
  shell,
  site,
  locale,
  activeTenants = [],
}: TenantOfflineContentProps) {
  const t = useTranslations('pages.platform.offline');
  const statusKey = shell.lifecycleStatus;
  const scheduledDate =
    shell.lifecycleStatus === 'scheduled' && shell.subscriptionStartsAt
      ? formatScheduledDate(shell.subscriptionStartsAt)
      : null;
  const showStaleLinkHint = shell.lifecycleStatus !== 'archived';

  const contactAction = useMemo(() => {
    const whatsappPhone = shell.contacts.receptionWhatsapp.raw;
    const message = t(resolveWhatsappMessageKey(shell.lifecycleStatus));

    if (shell.contacts.whatsappEnabled && whatsappPhone) {
      return {
        kind: 'whatsapp' as const,
        href: createWhatsappLink(whatsappPhone, message),
      };
    }

    if (shell.contacts.phone.href) {
      return {
        kind: 'tel' as const,
        href: shell.contacts.phone.href,
      };
    }

    if (shell.contacts.email.href) {
      return {
        kind: 'email' as const,
        href: shell.contacts.email.href,
      };
    }

    return null;
  }, [shell, t]);

  return (
    <div className="mx-auto flex min-h-[60vh] w-full max-w-md flex-col items-center justify-center gap-5 px-6 py-10 text-center">
      <div className="space-y-2">
        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
          {site === 'app' ? t('eyebrowApp') : t('eyebrowLanding')}
        </p>
        <h1 className="text-2xl font-semibold text-foreground">{shell.name}</h1>
        <p className="text-base font-medium text-foreground">{t(`${statusKey}.title`)}</p>
        <p className="text-sm leading-relaxed text-muted-foreground">{t(`${statusKey}.description`)}</p>
        {scheduledDate ? (
          <p className="text-xs text-muted-foreground">
            {t('scheduled.dateLabel', { date: scheduledDate })}
          </p>
        ) : null}
      </div>

      <div className="w-full space-y-3">
        {contactAction?.kind === 'whatsapp' ? (
          <ExternalServiceButton service="whatsapp" href={contactAction.href} className="w-full">
            {t('whatsappReception')}
          </ExternalServiceButton>
        ) : contactAction?.kind === 'tel' ? (
          <Button asChild size="lg" className="w-full">
            <a href={contactAction.href} className="flex items-center justify-center gap-2">
              <Icon icon={Phone} className="size-4" />
              {t('callReception')}
            </a>
          </Button>
        ) : contactAction?.kind === 'email' ? (
          <Button asChild size="lg" variant="outline" className="w-full">
            <a href={contactAction.href}>{t('emailHostel')}</a>
          </Button>
        ) : (
          <p className="text-sm text-muted-foreground">{t('noContact')}</p>
        )}
      </div>

      <TenantDirectoryList
        title={t('directoryTitle')}
        tenants={activeTenants}
        site={site}
        locale={locale}
        excludeSlug={shell.slug}
      />

      {showStaleLinkHint ? (
        <p className="text-xs text-muted-foreground">{t('staleLinkHint')}</p>
      ) : null}
    </div>
  );
}
