'use client';

import { useState } from 'react';
import { useHostelConfig } from '@/entities/tenant';
import { useTranslations } from '@/shared/i18n';
import { Button } from '@/shared/ui';

export function WifiCompactRow() {
  const t = useTranslations('components.wifi');
  const hostel = useHostelConfig();
  const [copied, setCopied] = useState(false);

  const wifiName = hostel.wifi.name?.trim();
  const wifiPassword = hostel.wifi.password?.trim();

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
    <section className="rounded-xl border bg-muted/30 px-4 py-3">
      <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{t('compactTitle')}</p>
      <div className="mt-2 flex items-center justify-between gap-3">
        <div className="min-w-0 space-y-0.5">
          <p className="truncate text-sm font-medium text-foreground">{wifiName}</p>
          <p className="font-mono text-xs text-muted-foreground">{wifiPassword}</p>
        </div>
        <Button type="button" size="sm" variant="outline" className="shrink-0" onClick={handleCopy}>
          {copied ? t('copiedLabel') : t('compactCopy')}
        </Button>
      </div>
    </section>
  );
}
