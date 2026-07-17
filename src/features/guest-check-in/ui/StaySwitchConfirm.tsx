'use client';

import { useTranslations } from '@/shared/i18n';
import { Button } from '@/shared/ui';

type StaySwitchConfirmProps = {
  currentBedId: string;
  incomingBedId: string;
  isPending?: boolean;
  onSwitch: () => void;
  onKeep: () => void;
};

export function StaySwitchConfirm({
  currentBedId,
  incomingBedId,
  isPending = false,
  onSwitch,
  onKeep,
}: StaySwitchConfirmProps) {
  const t = useTranslations('pages.checkIn.staySwitch');

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 px-4 py-16 text-center">
      <div className="space-y-2">
        <h1 className="text-xl font-semibold">{t('title')}</h1>
        <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">
          {t('description', { currentBed: currentBedId, incomingBed: incomingBedId })}
        </p>
      </div>
      <div className="flex w-full max-w-sm flex-col gap-2">
        <Button type="button" className="w-full" disabled={isPending} onClick={onSwitch}>
          {t('switch')}
        </Button>
        <Button
          type="button"
          variant="outline"
          className="w-full"
          disabled={isPending}
          onClick={onKeep}
        >
          {t('keep')}
        </Button>
      </div>
    </div>
  );
}
