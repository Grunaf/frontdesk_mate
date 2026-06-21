'use client';

import Link from 'next/link';
import { SITE_CONFIG } from '@/shared/config';
import { useTranslations } from '@/shared/i18n';
import { Button, Card, CardContent, CardDescription, CardTitle } from '@/shared/ui';

interface SuccessScreenProps {
  onReset: () => void;
}

export function SuccessScreen({ onReset }: SuccessScreenProps) {
  const t = useTranslations('features.uploadMemories.success');
  const siteUrl = SITE_CONFIG.publicSiteUrl;

  return (
    <Card className="min-h-[250px] text-center">
      <CardContent className="flex h-full flex-col items-center justify-center p-8">
        <CardTitle className="mb-1 text-xl">{t('title')}</CardTitle>
        <CardDescription className="mb-6">{t('description')}</CardDescription>
        <div className="flex flex-col items-center gap-3 sm:flex-row">
          <Button asChild>
            <Link href={siteUrl}>{t('backHome')}</Link>
          </Button>
          <Button type="button" variant="outline" onClick={onReset}>
            {t('uploadMore')}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
