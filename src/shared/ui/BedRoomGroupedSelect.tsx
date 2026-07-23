import { Label } from './label';

export type BedRoomOptionGroup = {
  roomId: string;
  roomLabel: string;
  beds: Array<{ bedId: string; displayLabel: string }>;
};

export type BedRoomGroupedSelectProps = {
  id?: string;
  label: string;
  hint?: string | null;
  bedId: string;
  onBedIdChange: (bedId: string) => void;
  bedsByRoom: BedRoomOptionGroup[];
  emptyLabel?: string;
  disabled?: boolean;
};

/**
 * Reception-style native bed picker: rooms as optgroups, bed slot labels inside.
 */
export function BedRoomGroupedSelect({
  id = 'bed-id',
  label,
  hint,
  bedId,
  onBedIdChange,
  bedsByRoom,
  emptyLabel = 'No beds for these dates',
  disabled = false,
}: BedRoomGroupedSelectProps) {
  return (
    <div className="space-y-1">
      <Label htmlFor={id}>{label}</Label>
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
      <select
        id={id}
        value={bedId}
        onChange={(event) => onBedIdChange(event.target.value)}
        disabled={disabled}
        className="w-full rounded-md border bg-background px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50"
      >
        {bedsByRoom.length === 0 ? (
          <option value="">{emptyLabel}</option>
        ) : (
          bedsByRoom.map((group) => (
            <optgroup key={group.roomId} label={group.roomLabel}>
              {group.beds.map((entry) => (
                <option key={entry.bedId} value={entry.bedId}>
                  {entry.displayLabel}
                </option>
              ))}
            </optgroup>
          ))
        )}
      </select>
    </div>
  );
}
