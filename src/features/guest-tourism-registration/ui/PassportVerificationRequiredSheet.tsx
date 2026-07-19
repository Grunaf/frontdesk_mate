'use client';

import { useTranslations } from '@/shared/i18n';
import {
  BottomSheet,
  BottomSheetContent,
  BottomSheetDescription,
  BottomSheetFooter,
  BottomSheetHeader,
  BottomSheetTitle,
  Button,
} from '@/shared/ui';

interface PassportVerificationRequiredSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PassportVerificationRequiredSheet({
  open,
  onOpenChange,
}: PassportVerificationRequiredSheetProps) {
  const t = useTranslations('pages.staySetup.passportGate');

  return (
    <BottomSheet open={open} onOpenChange={onOpenChange}>
      <BottomSheetContent>
        <BottomSheetHeader>
          <BottomSheetTitle>{t('title')}</BottomSheetTitle>
          <BottomSheetDescription>{t('description')}</BottomSheetDescription>
        </BottomSheetHeader>

        <BottomSheetFooter>
          <Button size="lg" className="w-full" onClick={() => onOpenChange(false)}>
            {t('dismiss')}
          </Button>
        </BottomSheetFooter>
      </BottomSheetContent>
    </BottomSheet>
  );
}
