'use client';

import { CircleHelp } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from './popover';

type FieldLabelHelpProps = {
  fieldLabel: string;
  /**
   * When set, the help icon calls this instead of opening a popover.
   * Use for long content that belongs in a bottom sheet.
   */
  onPress?: () => void;
  /** Required for popover mode; ignored when `onPress` is set. */
  children?: React.ReactNode;
};

export function FieldLabelHelp({ fieldLabel, children, onPress }: FieldLabelHelpProps) {
  const triggerClassName =
    'inline-flex shrink-0 rounded-sm text-muted-foreground hover:text-foreground';
  const ariaLabel = `Help: ${fieldLabel}`;

  if (onPress) {
    return (
      <button type="button" className={triggerClassName} aria-label={ariaLabel} onClick={onPress}>
        <CircleHelp className="h-4 w-4" aria-hidden />
      </button>
    );
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button type="button" className={triggerClassName} aria-label={ariaLabel}>
          <CircleHelp className="h-4 w-4" aria-hidden />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-80 gap-2 p-3 text-sm">
        <div className="space-y-2 text-muted-foreground">{children}</div>
      </PopoverContent>
    </Popover>
  );
}
