'use client';

import { useTranslations } from '@/shared/i18n';
import { Badge, Button } from '@/shared/ui';
import { Video, X } from 'lucide-react';

interface PreviewCardProps {
  file: File;
  src: string;
  index: number;
  onRemove: (index: number) => void;
}

export function PreviewCard({ file, src, index, onRemove }: PreviewCardProps) {
  const t = useTranslations('features.uploadMemories.preview');
  const isVideo = file.type.startsWith('video/');

  return (
    <div
      key={index}
      className="group/item relative aspect-square w-full overflow-hidden rounded-xl border border-border bg-muted/20"
    >
      <Button
        type="button"
        size="icon-sm"
        variant="secondary"
        onClick={() => onRemove(index)}
        className="absolute top-1.5 right-1.5 z-10 h-6 w-6 rounded-full"
        title={t('removeFile')}
      >
        <X className="h-3.5 w-3.5" />
      </Button>
      {isVideo ? (
        <div className="relative h-full w-full">
          <video src={src} className="h-full w-full object-cover" muted playsInline />

          <Badge
            variant="secondary"
            className="pointer-events-none absolute bottom-1.5 left-1.5 gap-1 text-xs uppercase"
          >
            <Video className="h-3 w-3" />
            <span>{t('video')}</span>
          </Badge>
        </div>
      ) : (
        <img src={src} alt={`preview-${index}`} className="h-full w-full object-cover" />
      )}
    </div>
  );
}
