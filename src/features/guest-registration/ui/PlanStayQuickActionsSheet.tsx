'use client';

import {
  BOTTOM_SHEET_SIZES,
  BottomSheet,
  BottomSheetBody,
  BottomSheetContent,
  BottomSheetHeader,
  BottomSheetTitle,
  Button,
} from '@/shared/ui';
import { cn } from '@/shared/lib/utils';
import type { PlanStayQuickAction, PlanStayQuickActionId } from '../lib/resolvePlanStayQuickActions';

export function PlanStayQuickActionsList({
  actions,
  busy = false,
  density = 'compact',
  onSelect,
}: {
  actions: PlanStayQuickAction[];
  busy?: boolean;
  /** `touch` ≈44px rows (bottom sheet); `compact` for desktop context menu. */
  density?: 'touch' | 'compact';
  onSelect: (id: PlanStayQuickActionId) => void;
}) {
  return (
    <ul className="flex flex-col gap-0.5">
      {actions.map((action) => (
        <li key={action.id}>
          <Button
            type="button"
            variant="ghost"
            size="default"
            disabled={busy}
            className={cn(
              'w-full justify-start px-3 text-sm font-medium',
              density === 'touch' ? 'min-h-11 py-2.5' : 'h-auto py-2',
              action.destructive && 'text-destructive hover:text-destructive',
              action.muted && 'opacity-50'
            )}
            onClick={() => onSelect(action.id)}
          >
            {action.label}
          </Button>
        </li>
      ))}
    </ul>
  );
}

export function PlanStayQuickActionsSheet({
  open,
  onOpenChange,
  title,
  meta,
  actions,
  busy = false,
  onSelect,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  meta: string;
  actions: PlanStayQuickAction[];
  busy?: boolean;
  onSelect: (id: PlanStayQuickActionId) => void;
}) {
  return (
    <BottomSheet open={open} onOpenChange={onOpenChange}>
      <BottomSheetContent size={BOTTOM_SHEET_SIZES.medium} className="px-0 pb-0">
        <BottomSheetHeader className="px-6 pb-3">
          <BottomSheetTitle className="truncate text-base">{title}</BottomSheetTitle>
          <p className="truncate text-xs text-muted-foreground">{meta}</p>
        </BottomSheetHeader>
        <BottomSheetBody className="px-3 pb-4">
          <PlanStayQuickActionsList
            actions={actions}
            busy={busy}
            density="touch"
            onSelect={(id) => {
              onSelect(id);
              onOpenChange(false);
            }}
          />
        </BottomSheetBody>
      </BottomSheetContent>
    </BottomSheet>
  );
}

/** Desktop right-click menu — fixed portal content positioned by the parent. */
export function PlanStayQuickActionsContextMenu({
  open,
  x,
  y,
  title,
  meta,
  actions,
  busy = false,
  onClose,
  onSelect,
}: {
  open: boolean;
  x: number;
  y: number;
  title: string;
  meta: string;
  actions: PlanStayQuickAction[];
  busy?: boolean;
  onClose: () => void;
  onSelect: (id: PlanStayQuickActionId) => void;
}) {
  if (!open) return null;

  return (
    <div
      role="presentation"
      className="fixed inset-0 z-[60]"
      onClick={onClose}
      onContextMenu={(event) => {
        event.preventDefault();
        onClose();
      }}
    >
      <div
        role="menu"
        aria-label={title}
        className="absolute min-w-48 rounded-lg border bg-background p-1 shadow-lg"
        style={{
          left: Math.min(x, typeof window !== 'undefined' ? window.innerWidth - 200 : x),
          top: Math.min(y, typeof window !== 'undefined' ? window.innerHeight - 280 : y),
        }}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="space-y-0.5 border-b border-border/60 px-3 py-1.5">
          <p className="truncate text-sm font-medium text-foreground">{title}</p>
          <p className="truncate text-xs text-muted-foreground">{meta}</p>
        </div>
        <PlanStayQuickActionsList
          actions={actions}
          busy={busy}
          onSelect={(id) => {
            onSelect(id);
            onClose();
          }}
        />
      </div>
    </div>
  );
}
