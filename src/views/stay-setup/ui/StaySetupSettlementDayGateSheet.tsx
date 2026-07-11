'use client';

import { useTenant } from '@/entities/tenant';
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

interface StaySetupSettlementDayGateSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function StaySetupSettlementDayGateSheet({
  open,
  onOpenChange,
}: StaySetupSettlementDayGateSheetProps) {
  const t = useTranslations('pages.staySetup.settlementDayGate');
  const { hostel } = useTenant();
  const checkInTime = hostel.checkInTime?.trim() || '14:00';

  return (
    <BottomSheet open={open} onOpenChange={onOpenChange}>
      <BottomSheetContent>
        <BottomSheetHeader>
          <BottomSheetTitle>{t('title')}</BottomSheetTitle>
          <BottomSheetDescription>{t('description', { time: checkInTime })}</BottomSheetDescription>
        </BottomSheetHeader>

        <BottomSheetBody className="pb-2">
          <p className="text-sm text-muted-foreground">{t('body')}</p>
        </BottomSheetBody>

        <BottomSheetFooter>
          <Button size="lg" className="w-full" onClick={() => onOpenChange(false)}>
            {t('dismiss')}
          </Button>
        </BottomSheetFooter>
      </BottomSheetContent>
    </BottomSheet>
  );
}
