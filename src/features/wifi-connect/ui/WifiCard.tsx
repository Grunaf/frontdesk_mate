'use client';

import { useState } from 'react';
import { useTranslations } from '@/shared/i18n';
import { Badge, Button, Card, CardContent, CardHeader, CardTitle } from '@/shared/ui';

interface WifiCardProps {
  wifiName: string;
  wifiPassword: string;
}

export function WifiCard({ wifiName, wifiPassword }: WifiCardProps) {
  const t = useTranslations('components.wifi');
  const [copied, setCopied] = useState(false);

  const handleCopyWifi = async () => {
    try {
      await navigator.clipboard.writeText(wifiPassword);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardHeader className="pb-2">
        <CardTitle>{t('title')}</CardTitle>
      </CardHeader>
      <CardContent className="flex items-center justify-between gap-4">
        <div className="space-y-2">
          <Badge variant="outline" className="border-primary/30 text-primary">
            Network: {wifiName}
          </Badge>
          <p className="font-mono text-sm font-bold text-foreground">Password: {wifiPassword}</p>
        </div>
        <Button
          type="button"
          size="sm"
          variant={copied ? 'default' : 'outline'}
          onClick={handleCopyWifi}
        >
          {copied ? t('copiedLabel') : t('copyLabel')}
        </Button>
      </CardContent>
    </Card>
  );
}
