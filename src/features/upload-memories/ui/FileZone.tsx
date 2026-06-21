'use client';

import { useTranslations } from '@/shared/i18n';
import { Card, CardContent, Input, Label } from '@/shared/ui';
import { Upload } from 'lucide-react';
import { PreviewCard } from './PreviewCard';

interface FileZoneProps {
  files: File[];
  previewURLs: string[];
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemove: (index: number) => void;
}

export function FileZone({ files, previewURLs, onChange, onRemove }: FileZoneProps) {
  const t = useTranslations('features.uploadMemories.fileZone');

  return (
    <Card className="min-h-[200px] border-dashed bg-muted/20 p-4">
      <Input
        id="file-upload-input"
        type="file"
        accept="image/*,video/*"
        multiple
        className="sr-only"
        onChange={onChange}
      />

      <CardContent className="p-0">
        {previewURLs.length === 0 ? (
          <Label
            htmlFor="file-upload-input"
            className="group flex h-full w-full cursor-pointer flex-col items-center justify-center py-8"
          >
            <Upload className="mb-2 h-8 w-8 transition-transform group-hover:scale-110" />
            <p className="text-sm font-medium text-foreground/80">{t('prompt')}</p>
            <p className="mt-1 text-xs text-muted-foreground">{t('limit')}</p>
          </Label>
        ) : (
          <div className="grid h-full w-full grid-cols-3 items-center gap-3">
            {files.map((file, index) => (
              <PreviewCard
                key={index}
                file={file}
                src={previewURLs[index]}
                index={index}
                onRemove={onRemove}
              />
            ))}

            <Label
              htmlFor="file-upload-input"
              className="flex aspect-square w-full cursor-pointer flex-col items-center justify-center rounded-xl border-dashed border-border bg-muted/30 text-muted-foreground transition-colors hover:border-primary/40 hover:bg-muted/50 hover:text-foreground"
              title={t('addMoreTitle')}
            >
              <span className="text-2xl font-light">+</span>
              <span className="mt-1 text-[10px] tracking-wide uppercase">{t('addMore')}</span>
            </Label>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
