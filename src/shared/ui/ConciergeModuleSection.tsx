'use client';

import type { ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight } from 'lucide-react';
import { SITE_CONFIG } from '@/shared/config';
import { setInAppReturnTo } from '@/shared/lib';
import { useTranslations } from '@/shared/i18n';
import { cn } from '@/shared/lib/utils';
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
            variant="ghost"
            onClick={handleSeeAll}
            className="h-auto min-h-0 max-w-[calc(45%+1rem)] shrink-0 self-end -m-2 p-2 hover:bg-transparent active:translate-y-0"
          >
            <span
              className={cn(
                'inline-flex max-w-full min-w-0 items-center gap-1 truncate rounded-md border border-border',
                'bg-background px-2.5 py-1 text-sm font-medium leading-none text-foreground',
                'group-hover/button:bg-input/50 group-active/button:translate-y-px',
                'dark:bg-input/30'
              )}
            >
              <span className="truncate">{resolvedSeeAllLabel}</span>
              <Icon icon={ArrowRight} className="size-3.5 shrink-0" />
            </span>
          </Button>
        ) : null}
      </div>
      {children}
    </section>
  );
}
