'use client';

import { useTranslations } from '@/shared/i18n';
import { Input, Label } from '@/shared/ui';

interface InstagramInputProps {
  value: string;
  onChange: (value: string) => void;
}

export function InstagramInput({ value, onChange }: InstagramInputProps) {
  const t = useTranslations('features.uploadMemories.instagram');

  return (
    <div className="space-y-2">
      <Label htmlFor="instagram-input" className="text-muted-foreground">
        {t('label')}
      </Label>
      <Input
        id="instagram-input"
        type="text"
        placeholder={t('placeholder')}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="bg-background"
      />
    </div>
  );
}
