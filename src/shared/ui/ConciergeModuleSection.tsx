'use client';

import type { ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight } from 'lucide-react';
import { SITE_CONFIG } from '@/shared/config';
import { setInAppReturnTo } from '@/shared/lib';
import { useTranslations } from '@/shared/i18n';
import { Icon } from './icon';

interface ConciergeModuleSectionProps {
  title: string;
  seeAllHref?: string;
  seeAllLabel?: string;
  children?: ReactNode;
}

export function ConciergeModuleSection({
  title,
  seeAllHref,
  seeAllLabel,
  children,
}: ConciergeModuleSectionProps) {
  const router = useRouter();
  const t = useTranslations('pages.concierge');
  const resolvedSeeAllLabel = seeAllLabel ?? t('seeAll');

  const handleSeeAll = () => {
    if (!seeAllHref) return;
    setInAppReturnTo(SITE_CONFIG.routes.app.concierge.path);
    router.push(seeAllHref);
  };

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-2 px-1">
        <h3 className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
          {title}
        </h3>
        {seeAllHref ? (
          <button
            type="button"
            onClick={handleSeeAll}
            className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <span>{resolvedSeeAllLabel}</span>
            <Icon icon={ArrowRight} className="h-3.5 w-3.5" />
          </button>
        ) : null}
      </div>
      {children}
    </section>
  );
}
