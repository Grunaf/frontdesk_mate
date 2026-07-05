'use client';

import { useTranslations } from '@/shared/i18n';
import { cn } from '@/shared/lib/utils';
import { useOwnerShell } from '../model/OwnerShellContext';

export function OwnerReadOnlyNotice() {
  const { canEditSettings } = useOwnerShell();
  const t = useTranslations('pages.owner.editAccess');

  if (canEditSettings) {
    return null;
  }

  return (
    <div
      className={cn('rounded-lg border border-muted-foreground/25 bg-muted/40 px-4 py-3 text-sm text-muted-foreground')}
      role="status"
    >
      {t('readOnlyNotice')}
    </div>
  );
}
