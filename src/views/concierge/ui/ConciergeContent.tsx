'use client';

import { useNightMode } from '@/shared/lib';
import { FAQAccordion } from '@/features/faq';
import { LocalGuide } from '@/features/welcome';
import { NightAccessCard } from '@/features/night-access';
import { useRouter } from 'next/navigation';
import { useTranslations } from '@/shared/i18n';
import { Button, Icon } from '@/shared/ui';
import { SITE_CONFIG } from '@/shared/config';
import { setInAppReturnTo } from '@/shared/lib';
import { ArrowRight } from 'lucide-react';

export function ConciergeContent() {
  const t = useTranslations('pages.concierge');
  const isNightMode = useNightMode();
  const router = useRouter();

  return (
    <>
      <Button
        type="button"
        variant="outline"
        onClick={() => {
          setInAppReturnTo(SITE_CONFIG.routes.app.concierge.path);
          router.push(SITE_CONFIG.routes.app.welcome.path);
        }}
        className="mb-4 h-auto w-full justify-between p-3 text-left text-xs font-medium"
      >
        <span>{t('arrivalGuideButton')}</span>
        <Icon icon={ArrowRight} className="h-4 w-4 text-muted-foreground" />
      </Button>
      <div className="border-t border-border pt-4">
        <LocalGuide />
      </div>

      {isNightMode && <NightAccessCard />}

      <FAQAccordion />
    </>
  );
}
