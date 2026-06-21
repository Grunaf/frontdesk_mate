import { cva } from 'class-variance-authority';

export const externalServiceButtonVariants = cva(
  'inline-flex w-full min-h-11 items-center justify-center gap-2 rounded-md border border-border bg-background px-4 text-sm font-semibold text-foreground shadow-xs transition-colors hover:bg-muted/60 active:bg-muted focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30'
);

export const externalServiceTouchLinkVariants = cva(
  'inline-flex min-h-11 max-w-full items-center gap-1.5 rounded-md px-2 py-2 -my-1 font-medium text-foreground underline decoration-foreground/35 underline-offset-[3px] transition-colors hover:bg-muted/50 hover:decoration-foreground/70 active:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30'
);
