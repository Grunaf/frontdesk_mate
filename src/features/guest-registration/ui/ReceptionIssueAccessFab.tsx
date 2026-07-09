'use client';

import { UserPlus } from 'lucide-react';
import { Button } from '@/shared/ui';
import { cn } from '@/shared/lib/utils';
import {
  RECEPTION_ISSUE_ACCESS_CTA_LABEL,
  RECEPTION_ISSUE_ACCESS_FAB_POSITION_CLASS,
} from './receptionIssueAccessCta';

interface ReceptionIssueAccessFabProps {
  visible: boolean;
  onPress: () => void;
}

export function ReceptionIssueAccessFab({ visible, onPress }: ReceptionIssueAccessFabProps) {
  if (!visible) {
    return null;
  }

  return (
    <Button
      type="button"
      size="icon-lg"
      className={cn(RECEPTION_ISSUE_ACCESS_FAB_POSITION_CLASS, 'rounded-full shadow-lg')}
      onClick={onPress}
      aria-label={RECEPTION_ISSUE_ACCESS_CTA_LABEL}
    >
      <UserPlus aria-hidden />
    </Button>
  );
}
