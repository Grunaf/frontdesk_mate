'use client';

import { useState } from 'react';
import { useHostelConfig } from '@/entities/tenant';
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

interface StayEssentialsWifiSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function StayEssentialsWifiSheet({ open, onOpenChange }: StayEssentialsWifiSheetProps) {
  const t = useTranslations('components.stayEssentials');
  const wifiT = useTranslations('components.wifi');
  const hostel = useHostelConfig();
  const [copied, setCopied] = useState(false);

  const wifiName = hostel.wifi.name?.trim() ?? '';
  const wifiPassword = hostel.wifi.password?.trim() ?? '';

  if (!wifiName || !wifiPassword) {
    return null;
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(wifiPassword);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <BottomSheet open={open} onOpenChange={onOpenChange}>
      <BottomSheetContent size="small" className="flex flex-col">
        <BottomSheetHeader>
          <BottomSheetTitle>{t('bridges.wifi')}</BottomSheetTitle>
        </BottomSheetHeader>

        <BottomSheetBody className="flex flex-1 flex-col pb-2">
          <div className="space-y-4">
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">{wifiT('sheetNetworkLabel')}</p>
              <p className="truncate text-lg font-semibold text-foreground">{wifiName}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">{wifiT('sheetPasswordLabel')}</p>
              <p className="font-mono text-lg font-semibold text-foreground">{wifiPassword}</p>
            </div>
          </div>
        </BottomSheetBody>

        <BottomSheetFooter>
          <Button type="button" className="w-full" onClick={handleCopy}>
            {copied ? wifiT('copiedLabel') : wifiT('copyLabel')}
          </Button>
        </BottomSheetFooter>
      </BottomSheetContent>
    </BottomSheet>
  );
}
