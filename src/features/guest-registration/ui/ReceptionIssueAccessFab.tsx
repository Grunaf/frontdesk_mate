'use client';

import { UserPlus } from 'lucide-react';
import { Button } from '@/shared/ui';
import { cn } from '@/shared/lib/utils';
import { RECEPTION_ISSUE_ACCESS_FAB_ARIA_LABEL } from './receptionIssueAccessCta';

interface ReceptionIssueAccessFabProps {
  visible: boolean;
  onPress: () => void;
  disabled?: boolean;
  className?: string;
}

/** Primary New booking control — parent owns fixed positioning (FAB cluster). */
export function ReceptionIssueAccessFab({
  visible,
  onPress,
  disabled = false,
  className,
}: ReceptionIssueAccessFabProps) {
  if (!visible) {
    return null;
  }

  return (
    <Button
      type="button"
      size="icon-lg"
      variant="default"
      disabled={disabled}
      className={cn('rounded-full shadow-lg', className)}
      onClick={onPress}
      aria-label={RECEPTION_ISSUE_ACCESS_FAB_ARIA_LABEL}
    >
      <UserPlus aria-hidden />
    </Button>
  );
}
