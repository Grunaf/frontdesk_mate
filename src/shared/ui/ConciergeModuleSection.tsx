'use client';

import type { ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight } from 'lucide-react';
import { SITE_CONFIG } from '@/shared/config';
import { setInAppReturnTo } from '@/shared/lib';
import { useTranslations } from '@/shared/i18n';
import { Button } from './button';
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
      <div className="flex items-end justify-between gap-3 px-1">
        <h3 className="min-w-0 flex-1 text-2xl font-semibold leading-tight text-foreground">
          {title}
        </h3>
        {seeAllHref ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleSeeAll}
            className="relative min-h-11 shrink-0 self-end max-w-[45%] px-2.5 py-2 text-sm leading-none -my-1.5"
          >
            <span className="truncate">{resolvedSeeAllLabel}</span>
            <Icon icon={ArrowRight} className="size-3.5 shrink-0" />
          </Button>
        ) : null}
      </div>
      {children}
    </section>
  );
}
