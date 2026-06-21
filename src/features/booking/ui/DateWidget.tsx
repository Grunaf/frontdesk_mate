'use client';

import { useTranslations } from '@/shared/i18n';
import { Input, Label } from '@/shared/ui';
import { useBookingDates } from '../lib/useBookingDates';

interface DateWidgetProps {
  isVisible: boolean;
}

export function DateWidget({ isVisible }: DateWidgetProps) {
  const t = useTranslations('components.hero');
  const { checkIn, checkOut, setDate } = useBookingDates();

  if (!isVisible) return null;

  return (
    <div className="sticky top-0 z-50 border-b border-border bg-card/95 p-2 shadow-sm backdrop-blur-md md:p-4">
      <div className="mx-auto flex max-w-7xl items-center gap-2">
        <div className="flex flex-1 flex-col gap-1 rounded-xl border bg-muted px-3 py-2 md:border-0 md:bg-transparent md:p-0">
          <Label className="md:sr-only">{t('checkIn')}</Label>
          <Input
            type="date"
            value={checkIn}
            onChange={(e) => setDate('checkIn', e.target.value)}
            className="border-0 bg-transparent p-0 text-sm font-bold shadow-none focus-visible:ring-0"
          />
        </div>

        <div className="hidden h-6 w-px bg-border md:block" />

        <div className="flex flex-1 flex-col gap-1 rounded-xl border bg-muted px-3 py-2 md:border-0 md:bg-transparent md:p-0">
          <Label className="md:sr-only">{t('checkOut')}</Label>
          <Input
            type="date"
            value={checkOut}
            onChange={(e) => setDate('checkOut', e.target.value)}
            className="border-0 bg-transparent p-0 text-sm font-bold shadow-none focus-visible:ring-0"
          />
        </div>
      </div>
    </div>
  );
}
