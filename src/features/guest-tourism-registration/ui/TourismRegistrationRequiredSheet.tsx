'use client';

import { useTranslations } from '@/shared/i18n';
import {
  BottomSheet,
  BottomSheetBody,
  BottomSheetContent,
  BottomSheetDescription,
  BottomSheetFooter,
  BottomSheetHeader,
  BottomSheetTitle,
  Button,
} from '@/shared/ui';

interface TourismRegistrationRequiredSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onGoToRegistration: () => void;
}

export function TourismRegistrationRequiredSheet({
  open,
  onOpenChange,
  onGoToRegistration,
}: TourismRegistrationRequiredSheetProps) {
  const t = useTranslations('pages.arrivalJourney.tourismGate');

  const handleGoToRegistration = () => {
    onOpenChange(false);
    onGoToRegistration();
  };

  return (
    <BottomSheet open={open} onOpenChange={onOpenChange}>
      <BottomSheetContent>
        <BottomSheetHeader>
          <BottomSheetTitle>{t('title')}</BottomSheetTitle>
          <BottomSheetDescription>{t('description')}</BottomSheetDescription>
        </BottomSheetHeader>

        <BottomSheetBody className="pb-2">
          <ol className="space-y-3 text-sm text-foreground">
            <li className="flex gap-3">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                1
              </span>
              <span className="pt-0.5">{t('step1')}</span>
            </li>
            <li className="flex gap-3">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                2
              </span>
              <span className="pt-0.5">{t('step2')}</span>
            </li>
            <li className="flex gap-3">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                3
              </span>
              <span className="pt-0.5">{t('step3')}</span>
            </li>
          </ol>
        </BottomSheetBody>

        <BottomSheetFooter>
          <Button size="lg" className="w-full" onClick={handleGoToRegistration}>
            {t('cta')}
          </Button>
        </BottomSheetFooter>
      </BottomSheetContent>
    </BottomSheet>
  );
}
