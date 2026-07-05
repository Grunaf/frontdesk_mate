'use client';

import type { LaunchBookingPath } from '@/entities/tenant/lib/resolveGuestPathReadiness';
import { cn } from '@/shared/lib/utils';

interface LaunchBookingForkProps {
  value: LaunchBookingPath;
  onChange: (path: LaunchBookingPath) => void;
}

const OPTIONS: { value: LaunchBookingPath; title: string; description: string }[] = [
  {
    value: 'engine',
    title: 'Online booking engine',
    description: 'Guests book through Cloudbeds or Frontdesk Master with dates from the hero.',
  },
  {
    value: 'wa',
    title: 'WhatsApp only',
    description:
      'No online engine — hero and room cards open WhatsApp using the reception phone by default.',
  },
];

export function LaunchBookingFork({ value, onChange }: LaunchBookingForkProps) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {OPTIONS.map((option) => {
        const selected = value === option.value;

        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={cn(
              'rounded-xl border px-4 py-3 text-left transition-colors',
              selected
                ? 'border-primary bg-primary/5 ring-1 ring-primary/30'
                : 'border-border bg-background hover:bg-muted/40'
            )}
          >
            <span className="block text-sm font-semibold">{option.title}</span>
            <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">
              {option.description}
            </span>
          </button>
        );
      })}
    </div>
  );
}
