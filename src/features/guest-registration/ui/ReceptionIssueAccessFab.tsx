'use client';

import { UserPlus, X } from 'lucide-react';
import { Button } from '@/shared/ui';
import { cn } from '@/shared/lib/utils';
import {
  RECEPTION_CANCEL_MOVE_FAB_ARIA_LABEL,
  RECEPTION_CANCEL_MOVE_FAB_POSITION_CLASS,
  RECEPTION_ISSUE_ACCESS_FAB_ARIA_LABEL,
  RECEPTION_ISSUE_ACCESS_FAB_POSITION_CLASS,
} from './receptionIssueAccessCta';

export type ReceptionDeskFabMode = 'newBooking' | 'cancelMove';

interface ReceptionIssueAccessFabProps {
  visible: boolean;
  onPress: () => void;
  /** Defaults to new booking. Cancel-move reuses the same FAB slot. */
  mode?: ReceptionDeskFabMode;
  disabled?: boolean;
}

export function ReceptionIssueAccessFab({
  visible,
  onPress,
  mode = 'newBooking',
  disabled = false,
}: ReceptionIssueAccessFabProps) {
  if (!visible) {
    return null;
  }

  const cancelMove = mode === 'cancelMove';

  return (
    <Button
      type="button"
      size="icon-lg"
      variant={cancelMove ? 'outline' : 'default'}
      disabled={disabled}
      className={cn(
        cancelMove
          ? RECEPTION_CANCEL_MOVE_FAB_POSITION_CLASS
          : RECEPTION_ISSUE_ACCESS_FAB_POSITION_CLASS,
        'rounded-full shadow-lg',
        cancelMove && 'bg-background hover:bg-background'
      )}
      onClick={onPress}
      aria-label={
        cancelMove ? RECEPTION_CANCEL_MOVE_FAB_ARIA_LABEL : RECEPTION_ISSUE_ACCESS_FAB_ARIA_LABEL
      }
    >
      {cancelMove ? <X aria-hidden /> : <UserPlus aria-hidden />}
    </Button>
  );
}
