'use client';

import QRCode from 'qrcode';
import { useEffect, useState } from 'react';
import { useTranslations } from '@/shared/i18n';

interface GuestStayReceptionQrPanelProps {
  active: boolean;
  stayDetailUrl: string;
}

export function GuestStayReceptionQrPanel({
  active,
  stayDetailUrl,
}: GuestStayReceptionQrPanelProps) {
  const t = useTranslations('components.guestStayChip');
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!active || !stayDetailUrl) {
      setQrDataUrl(null);
      return;
    }

    let cancelled = false;
    QRCode.toDataURL(stayDetailUrl, { margin: 1, width: 280 })
      .then((url) => {
        if (!cancelled) setQrDataUrl(url);
      })
      .catch(() => {
        if (!cancelled) setQrDataUrl(null);
      });

    return () => {
      cancelled = true;
    };
  }, [active, stayDetailUrl]);

  return (
    <div className="mx-auto flex w-full max-w-sm flex-col items-center gap-4">
      <p className="text-center text-sm leading-relaxed text-muted-foreground">
        {t('receptionQrHint')}
      </p>

      <div className="flex w-full justify-center rounded-lg border bg-background p-3">
        {qrDataUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- data URL from qrcode
          <img
            src={qrDataUrl}
            alt={t('receptionQrImageAlt')}
            width={280}
            height={280}
            className="h-auto w-full max-w-[280px]"
          />
        ) : (
          <div
            className="flex aspect-square w-full max-w-[280px] items-center justify-center text-sm text-muted-foreground"
            aria-hidden
          >
            …
          </div>
        )}
      </div>
    </div>
  );
}
