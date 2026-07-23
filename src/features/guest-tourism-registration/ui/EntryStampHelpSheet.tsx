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

type EntryStampHelpSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imageUrl?: string | null;
};

export function EntryStampHelpSheet({
  open,
  onOpenChange,
  imageUrl,
}: EntryStampHelpSheetProps) {
  const t = useTranslations('pages.staySetup.entryDate.stampHelp');
  const trimmed = imageUrl?.trim() || '';

  return (
    <BottomSheet open={open} onOpenChange={onOpenChange}>
      <BottomSheetContent>
        <BottomSheetHeader>
          <BottomSheetTitle>{t('title')}</BottomSheetTitle>
        </BottomSheetHeader>

        <BottomSheetBody className="space-y-4 pb-2">
          <p className="text-sm leading-relaxed text-muted-foreground">{t('body')}</p>
          {trimmed ? (
            // eslint-disable-next-line @next/next/no-img-element -- tenant-uploaded sample URL
            <img
              src={trimmed}
              alt={t('imageAlt')}
              className="mx-auto max-h-64 w-full rounded-xl border border-border/60 object-contain bg-muted/20"
            />
          ) : (
            <p className="rounded-xl border border-dashed border-border/60 bg-muted/20 px-3 py-4 text-sm text-muted-foreground">
              {t('imageMissing')}
            </p>
          )}
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
