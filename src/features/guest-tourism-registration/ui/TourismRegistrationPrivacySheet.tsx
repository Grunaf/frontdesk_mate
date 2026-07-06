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

type TourismRegistrationPrivacySheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function TourismRegistrationPrivacySheet({
  open,
  onOpenChange,
}: TourismRegistrationPrivacySheetProps) {
  const t = useTranslations('pages.staySetup.register.privacy');

  return (
    <BottomSheet open={open} onOpenChange={onOpenChange}>
      <BottomSheetContent>
        <BottomSheetHeader>
          <BottomSheetTitle>{t('title')}</BottomSheetTitle>
        </BottomSheetHeader>

        <BottomSheetBody className="pb-2">
          <p className="text-sm leading-relaxed text-muted-foreground">{t('body')}</p>
        </BottomSheetBody>

        <BottomSheetFooter>
          <Button type="button" variant="outline" className="w-full" onClick={() => onOpenChange(false)}>
            {t('dismiss')}
          </Button>
        </BottomSheetFooter>
      </BottomSheetContent>
    </BottomSheet>
  );
}
