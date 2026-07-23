'use client';

import { useTranslations } from '@/shared/i18n';
import {
  BottomSheet,
  BottomSheetBody,
  BottomSheetContent,
  BottomSheetFooter,
  BottomSheetHeader,
  BottomSheetTitle,
  Button,
} from '@/shared/ui';

type FinishTourismGuestDraftSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onContinue: () => void;
};

export function FinishTourismGuestDraftSheet({
  open,
  onOpenChange,
  onContinue,
}: FinishTourismGuestDraftSheetProps) {
  const t = useTranslations('pages.staySetup.register.draft');

  return (
    <BottomSheet open={open} onOpenChange={onOpenChange}>
      <BottomSheetContent>
        <BottomSheetHeader>
          <BottomSheetTitle>{t('finishTitle')}</BottomSheetTitle>
        </BottomSheetHeader>

        <BottomSheetBody className="pb-2">
          <p className="text-sm leading-relaxed text-muted-foreground">{t('finishBody')}</p>
        </BottomSheetBody>

        <BottomSheetFooter className="gap-2">
          <Button
            type="button"
            className="w-full"
            onClick={() => {
              onOpenChange(false);
              onContinue();
            }}
          >
            {t('continue')}
          </Button>
          <Button type="button" variant="outline" className="w-full" onClick={() => onOpenChange(false)}>
            {t('dismiss')}
          </Button>
        </BottomSheetFooter>
      </BottomSheetContent>
    </BottomSheet>
  );
}
