'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import {
  readGuestIntent,
  writeGuestIntent,
  guestIntentToEntry,
  type GuestIntent,
} from '../lib/guestIntent';
import { resolveGuestWelcomePath } from '../lib/resolveGuestWelcomePath';
import { useGuestSession } from './GuestSessionProvider';
import { useTranslations } from '@/shared/i18n';
import { Button } from '@/shared/ui';

interface GuestIntentScreenProps {
  locale: string;
}

const INTENT_OPTIONS: GuestIntent[] = ['planning', 'at_door', 'at_desk'];

export function GuestIntentScreen({ locale }: GuestIntentScreenProps) {
  const t = useTranslations('pages.checkIn.intent');
  const router = useRouter();
  const { currentTenantSlug, isRegistered } = useGuestSession();

  useEffect(() => {
    if (!isRegistered) {
      router.replace(`/${locale}/check-in`);
      return;
    }

    if (!currentTenantSlug) return;

    const storedIntent = readGuestIntent(currentTenantSlug);
    if (storedIntent) {
      router.replace(
        resolveGuestWelcomePath({
          locale,
          entry: guestIntentToEntry(storedIntent),
        })
      );
    }
  }, [currentTenantSlug, isRegistered, locale, router]);

  const handleSelect = (intent: GuestIntent) => {
    if (!currentTenantSlug) return;

    writeGuestIntent(currentTenantSlug, intent);
    router.replace(
      resolveGuestWelcomePath({
        locale,
        entry: guestIntentToEntry(intent),
      })
    );
  };

  if (!isRegistered) {
    return null;
  }

  return (
    <div className="flex flex-1 flex-col items-center gap-6 px-4 py-10 text-center">
      <div className="space-y-2">
        <p className="text-xs font-semibold tracking-wider text-primary uppercase">{t('eyebrow')}</p>
        <h1 className="text-xl font-semibold">{t('title')}</h1>
        <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">{t('description')}</p>
      </div>

      <div className="flex w-full max-w-sm flex-col gap-3">
        {INTENT_OPTIONS.map((intent) => (
          <Button key={intent} type="button" size="lg" className="w-full" onClick={() => handleSelect(intent)}>
            {t(`options.${intent}`)}
          </Button>
        ))}
      </div>
    </div>
  );
}
