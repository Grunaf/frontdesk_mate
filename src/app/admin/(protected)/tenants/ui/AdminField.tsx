import { cn } from '@/shared/lib/utils';

function MissingFieldHint() {
  return <span className="text-xs font-normal text-amber-700">Required for guests</span>;
}

export function AdminField({
  label,
  name,
  defaultValue,
  value,
  onChange,
  type = 'text',
  placeholder,
  hint,
  className,
  missing = false,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  value?: string;
  onChange?: (value: string) => void;
  type?: string;
  placeholder?: string;
  hint?: string;
  className?: string;
  missing?: boolean;
}) {
  const isControlled = value !== undefined;

  return (
    <label className={cn('block space-y-1.5', className)}>
      <span className="flex flex-wrap items-center gap-2 text-sm font-medium">
        {label}
        {missing ? <MissingFieldHint /> : null}
      </span>
      {hint && <span className="block text-xs text-muted-foreground">{hint}</span>}
      <input
        name={name}
        type={type}
        value={isControlled ? value : undefined}
        defaultValue={isControlled ? undefined : defaultValue}
        onChange={isControlled ? (event) => onChange?.(event.target.value) : undefined}
        placeholder={placeholder}
        className={cn(
          'w-full rounded-md border bg-background px-3 py-2 text-sm',
          missing && 'border-amber-400 ring-1 ring-amber-200'
        )}
      />
    </label>
  );
}

export function AdminTextarea({
  label,
  name,
  defaultValue,
  placeholder,
  hint,
  rows = 3,
  missing = false,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  placeholder?: string;
  hint?: string;
  rows?: number;
  missing?: boolean;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="flex flex-wrap items-center gap-2 text-sm font-medium">
        {label}
        {missing ? <MissingFieldHint /> : null}
      </span>
      {hint && <span className="block text-xs text-muted-foreground">{hint}</span>}
      <textarea
        name={name}
        defaultValue={defaultValue}
        placeholder={placeholder}
        rows={rows}
        className={cn(
          'w-full rounded-md border bg-background px-3 py-2 text-sm',
          missing && 'border-amber-400 ring-1 ring-amber-200'
        )}
      />
    </label>
  );
}

export function AdminCheckbox({
  label,
  name,
  defaultChecked,
  hint,
}: {
  label: string;
  name: string;
  defaultChecked?: boolean;
  hint?: string;
}) {
  return (
    <label className="flex items-start gap-2 text-sm">
      <input
        type="checkbox"
        name={name}
        value="true"
        defaultChecked={defaultChecked}
        className="mt-0.5 size-4 shrink-0 rounded border"
      />
      <span>
        <span className="font-medium">{label}</span>
        {hint && <span className="mt-0.5 block text-xs text-muted-foreground">{hint}</span>}
      </span>
    </label>
  );
}

const BADGE_TITLES = {
  ready: 'Visible to guests',
  preview: 'Shown with placeholders or partial content',
  hidden: 'Module hidden from guests',
  'n/a': 'Not applicable',
} as const;

export function AdminSectionStatusBadge({ status }: { status: 'ready' | 'preview' | 'hidden' | 'n/a' }) {
  const styles = {
    ready: 'bg-green-100 text-green-900',
    preview: 'bg-amber-100 text-amber-900',
    hidden: 'bg-muted text-muted-foreground',
    'n/a': 'bg-muted/60 text-muted-foreground',
  } as const;

  const labels = {
    ready: 'Live',
    preview: 'Partial',
    hidden: 'Off',
    'n/a': '—',
  } as const;

  return (
    <span
      title={BADGE_TITLES[status]}
      className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${styles[status]}`}
    >
      {labels[status]}
    </span>
  );
}
