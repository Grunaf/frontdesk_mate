'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { CheckInRequiredSheet } from './CheckInRequiredSheet';
import { CrossHostelStrip } from './CrossHostelStrip';
import { useIsGuestRegistered } from './GuestSessionProvider';
import { useTranslations } from '@/shared/i18n';
import { SITE_CONFIG } from '@/shared/config';
import { Button } from '@/shared/ui';

export function GuestAccessPanel() {
  const isRegistered = useIsGuestRegistered();
  const t = useTranslations('pages.checkIn');
  const params = useParams<{ locale: string }>();
  const locale = params.locale ?? 'en';
  const welcomePath = `/${locale}${SITE_CONFIG.routes.app.welcome.path}`;
  const [checkInSheetOpen, setCheckInSheetOpen] = useState(false);

  if (isRegistered) {
    return null;
  }

  return (
    <div className="space-y-4">
      <CrossHostelStrip />

      <div className="space-y-4 rounded-xl border border-dashed border-primary/30 bg-primary/5 p-5">
        <div className="space-y-2 text-center">
          <p className="text-xs font-semibold tracking-wider text-primary uppercase">
            {t('registrationPrompt.eyebrow')}
          </p>
          <h2 className="text-xl font-semibold">{t('registrationPrompt.title')}</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">{t('registrationPrompt.description')}</p>
        </div>

        <Button type="button" className="w-full" onClick={() => setCheckInSheetOpen(true)}>
          {t('checkInRequired.openSheetButton')}
        </Button>

        <Button asChild className="w-full" variant="outline">
          <Link href={welcomePath}>{t('registrationPrompt.openWelcomeButton')}</Link>
        </Button>
      </div>

      <CheckInRequiredSheet open={checkInSheetOpen} onOpenChange={setCheckInSheetOpen} />
    </div>
  );
}
