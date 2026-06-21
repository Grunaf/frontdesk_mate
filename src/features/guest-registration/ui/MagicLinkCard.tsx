'use client';

import QRCode from 'qrcode';
import { useEffect, useState } from 'react';
import { useTranslations } from '@/shared/i18n';
import { Button } from '@/shared/ui';

interface MagicLinkCardProps {
  magicLinkUrl: string;
  bedId: string;
  guestName?: string;
  guestPin?: string;
  onDismiss?: () => void;
}

function formatGuestPin(pin: string): string {
  const digits = pin.replace(/\D/g, '');
  if (digits.length !== 6) return pin;
  return `${digits.slice(0, 3)} ${digits.slice(3)}`;
}

export function MagicLinkCard({ magicLinkUrl, bedId, guestName, guestPin, onDismiss }: MagicLinkCardProps) {
  const t = useTranslations('admin.guestCheckIn.magicLink');
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;

    QRCode.toDataURL(magicLinkUrl, { margin: 1, width: 220 })
      .then((url) => {
        if (!cancelled) setQrDataUrl(url);
      })
      .catch(() => {
        if (!cancelled) setQrDataUrl(null);
      });

    return () => {
      cancelled = true;
    };
  }, [magicLinkUrl]);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(magicLinkUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="space-y-4 rounded-xl border border-primary/20 bg-primary/5 p-4">
      <div>
        <p className="text-sm font-semibold text-foreground">{t('title')}</p>
        <p className="text-xs text-muted-foreground">
          {guestName ? t('subtitleNamed', { name: guestName, bed: bedId }) : t('subtitle', { bed: bedId })}
        </p>
      </div>

      {guestPin ? (
        <div className="rounded-lg border bg-background p-4 text-center">
          <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">{t('pinLabel')}</p>
          <p className="mt-2 font-mono text-3xl font-bold tracking-[0.2em] text-foreground">
            {formatGuestPin(guestPin)}
          </p>
          <p className="mt-2 text-xs text-muted-foreground">{t('pinHint')}</p>
        </div>
      ) : null}

      {qrDataUrl ? (
        <div className="flex justify-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qrDataUrl} alt={t('qrAlt')} className="rounded-lg border bg-white p-2" />
        </div>
      ) : null}

      <div className="space-y-2">
        <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">{t('linkLabel')}</p>
        <code className="block break-all rounded-md border bg-background px-2 py-2 text-[11px]">{magicLinkUrl}</code>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" onClick={copyLink}>
          {copied ? t('copied') : t('copy')}
        </Button>
        {onDismiss ? (
          <Button type="button" size="sm" variant="outline" onClick={onDismiss}>
            {t('done')}
          </Button>
        ) : null}
      </div>
    </div>
  );
}
