'use client';

import { ChevronLeft } from 'lucide-react';
import type { ReactNode } from 'react';
import { useTranslations } from '@/shared/i18n';
import { cn } from '@/shared/lib/utils';
import { Button } from './button';
import { Icon } from './icon';

type IconBackActionsRowProps = {
  onBack?: () => void;
  children: ReactNode;
  className?: string;
};

export function IconBackActionsRow({ onBack, children, className }: IconBackActionsRowProps) {
  const tNav = useTranslations('pages.navigation');

  return (
    <div className={cn('flex shrink-0 items-stretch gap-2', className)}>
      {onBack ? (
        <Button
          type="button"
          variant="outline"
          size="icon-lg"
          aria-label={tNav('back')}
          onClick={onBack}
        >
          <Icon icon={ChevronLeft} className="size-5" />
        </Button>
      ) : null}
      <div className="min-w-0 flex-1 [&_button]:w-full">{children}</div>
    </div>
  );
}
