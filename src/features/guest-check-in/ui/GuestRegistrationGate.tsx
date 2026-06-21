'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useGuestSession } from './GuestSessionProvider';
import { useTranslations } from '@/shared/i18n';
import { SITE_CONFIG } from '@/shared/config';
import { Button } from '@/shared/ui';

interface RegistrationPromptProps {
  compact?: boolean;
  showWelcomeLink?: boolean;
}

export function RegistrationPrompt({ compact = false, showWelcomeLink = true }: RegistrationPromptProps) {
  const t = useTranslations('pages.checkIn.registrationPrompt');
  const params = useParams<{ locale: string }>();
  const locale = params.locale ?? 'en';
  const welcomePath = `/${locale}${SITE_CONFIG.routes.app.welcome.path}`;

  return (
    <div
      className={
        compact
          ? 'rounded-xl border border-dashed border-primary/30 bg-primary/5 p-4'
          : 'flex flex-1 flex-col items-center justify-center gap-4 px-4 py-10 text-center'
      }
    >
      <div className="space-y-2">
        <p className="text-xs font-semibold tracking-wider text-primary uppercase">{t('eyebrow')}</p>
        <h2 className={compact ? 'text-base font-semibold' : 'text-xl font-semibold'}>{t('title')}</h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          {showWelcomeLink ? t('description') : t('welcomeDescription')}
        </p>
      </div>
      {showWelcomeLink ? (
        <Button asChild className={compact ? 'w-full' : undefined}>
          <Link href={welcomePath}>{t('openWelcomeButton')}</Link>
        </Button>
      ) : null}
    </div>
  );
}

interface GuestRegistrationGateProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function GuestRegistrationGate({ children, fallback }: GuestRegistrationGateProps) {
  const { isRegistered } = useGuestSession();

  if (!isRegistered) {
    return fallback ?? <RegistrationPrompt compact />;
  }

  return <>{children}</>;
}
