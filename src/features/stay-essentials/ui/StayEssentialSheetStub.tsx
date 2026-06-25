'use client';

import { useTranslations } from '@/shared/i18n';
import {
  BottomSheet,
  BottomSheetBody,
  BottomSheetContent,
  BottomSheetHeader,
  BottomSheetTitle,
} from '@/shared/ui';
import type { StayEssentialBridgeId } from '../model/types';

interface StayEssentialSheetStubProps {
  bridgeId: StayEssentialBridgeId;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function StayEssentialSheetStub({ bridgeId, open, onOpenChange }: StayEssentialSheetStubProps) {
  const t = useTranslations('components.stayEssentials');

  return (
    <BottomSheet open={open} onOpenChange={onOpenChange}>
      <BottomSheetContent>
        <BottomSheetHeader>
          <BottomSheetTitle>{t(`bridges.${bridgeId}`)}</BottomSheetTitle>
        </BottomSheetHeader>
        <BottomSheetBody>
          <p className="text-sm text-muted-foreground">{t('sheetStub')}</p>
        </BottomSheetBody>
      </BottomSheetContent>
    </BottomSheet>
  );
}
