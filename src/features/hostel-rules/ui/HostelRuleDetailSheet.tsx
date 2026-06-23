'use client';

import type { ResolvedHouseRuleDisplay } from '@/entities/house-rules';
import {
  BottomSheet,
  BottomSheetBody,
  BottomSheetContent,
  BottomSheetHeader,
  BottomSheetTitle,
  Icon,
} from '@/shared/ui';

interface HostelRuleDetailSheetProps {
  rule: ResolvedHouseRuleDisplay | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function HostelRuleDetailSheet({ rule, open, onOpenChange }: HostelRuleDetailSheetProps) {
  if (!rule) {
    return null;
  }

  return (
    <BottomSheet open={open} onOpenChange={onOpenChange}>
      <BottomSheetContent size="small" className="px-0 pb-0">
        <BottomSheetHeader className="px-6 pb-3">
          <div className="flex items-start gap-3 pr-8">
            <div className="shrink-0 rounded-xl bg-muted p-2 text-muted-foreground">
              <Icon icon={rule.icon} className="h-5 w-5" />
            </div>
            <BottomSheetTitle className="text-base leading-snug">{rule.summary}</BottomSheetTitle>
          </div>
        </BottomSheetHeader>

        <BottomSheetBody className="pb-6">
          <p className="text-sm leading-relaxed text-muted-foreground">{rule.detail}</p>
        </BottomSheetBody>
      </BottomSheetContent>
    </BottomSheet>
  );
}
