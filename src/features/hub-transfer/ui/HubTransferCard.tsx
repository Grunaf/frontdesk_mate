'use client';

import { useTranslations } from '@/shared/i18n';
import { CardTitle, Icon } from '@/shared/ui';
import { ArrowLeftRight, ChevronRight } from 'lucide-react';

export function HubTransferCard({ onTransferClick }: { onTransferClick: () => void }) {
  const t = useTranslations('components.hubTransfer');

  return (
    <button
      type="button"
      onClick={onTransferClick}
      className="flex w-full items-start gap-4 rounded-lg text-left transition-colors hover:bg-muted/30"
    >
      <div className="shrink-0 rounded-xl bg-muted p-2 text-muted-foreground">
        <Icon icon={ArrowLeftRight} className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1 space-y-1">
        <CardTitle className="text-sm text-foreground">{t('cardTitle')}</CardTitle>
        <p className="text-xs leading-relaxed text-muted-foreground">{t('cardDescription')}</p>
      </div>
      <Icon icon={ChevronRight} className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" />
    </button>
  );
}
