'use client';

import type { PlaceIconId } from '@/entities/hostel';
import { PLACE_ICON_PRESETS, resolvePlaceLucideIcon } from '@/entities/hostel';
import { cn } from '@/shared/lib/utils';
import { Icon } from '@/shared/ui';

interface PlaceIconPickerProps {
  value?: PlaceIconId;
  onChange: (iconId: PlaceIconId | undefined) => void;
}

export function PlaceIconPicker({ value, onChange }: PlaceIconPickerProps) {
  const selected = value ?? 'default';

  return (
    <div className="space-y-1.5">
      <span className="text-xs font-medium text-muted-foreground">Map icon</span>
      <div className="flex flex-wrap gap-1.5">
        {PLACE_ICON_PRESETS.map((preset) => {
          const isSelected = selected === preset.id;
          const PresetIcon = resolvePlaceLucideIcon({ iconId: preset.id });

          return (
            <button
              key={preset.id}
              type="button"
              title={preset.label}
              aria-label={preset.label}
              aria-pressed={isSelected}
              onClick={() =>
                onChange(preset.id === 'default' ? undefined : preset.id)
              }
              className={cn(
                'flex h-10 w-10 items-center justify-center rounded-lg border transition-colors',
                isSelected
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border bg-background text-muted-foreground hover:bg-muted/50'
              )}
            >
              <Icon icon={PresetIcon} className="h-4 w-4" />
            </button>
          );
        })}
      </div>
    </div>
  );
}
