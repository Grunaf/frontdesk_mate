'use client';

import type { ComponentProps } from 'react';
import { cn } from '@/shared/lib/utils';
import { useLinkPressFeedback } from '@/shared/ui/action-feedback';
import { pressablePendingClass } from './pressableVariants';

type PressableAnchorProps = ComponentProps<'a'>;

/** Anchor with brief pending feedback after tap (external / mailto / tel). */
export function PressableAnchor({ className, onClick, ...props }: PressableAnchorProps) {
  const { pending, bindLinkPress } = useLinkPressFeedback();
  const pressProps = bindLinkPress(onClick);

  return (
    <a
      className={cn(pending && pressablePendingClass, className)}
      {...pressProps}
      {...props}
    />
  );
}
