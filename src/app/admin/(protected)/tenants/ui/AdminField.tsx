import {
  getCurrencyDefinition,
  type CurrencyCode,
} from '@/shared/lib/currency';
import { cn } from '@/shared/lib/utils';

export type AdminFieldWidth = 'xs' | 'sm' | 'md' | 'lg' | 'full';

const FIELD_WIDTH_CLASSES: Record<AdminFieldWidth, string> = {
  xs: 'max-w-[7.5rem] w-full',
  sm: 'max-w-[12rem] w-full',
  md: 'max-w-md w-full',
  lg: 'w-full',
  full: 'w-full',
};

export function adminFieldWidthClass(width: AdminFieldWidth = 'full'): string {
  return FIELD_WIDTH_CLASSES[width];
}

export function AdminFieldRow({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={cn('flex flex-wrap items-end gap-4', className)}>{children}</div>;
}

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
  width = 'full',
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
  width?: AdminFieldWidth;
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
          'rounded-md border bg-background px-3 py-2 text-sm',
          adminFieldWidthClass(width),
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

export function AdminMoneyField({
  label,
  name,
  defaultValue,
  value,
  onChange,
  currencyCode,
  hint,
  missing = false,
  amountHint,
}: {
  label: string;
  name?: string;
  defaultValue?: string | number;
  value?: string | number;
  onChange?: (value: string) => void;
  currencyCode: CurrencyCode;
  hint?: string;
  missing?: boolean;
  amountHint?: string;
}) {
  const currency = getCurrencyDefinition(currencyCode);
  const isControlled = value !== undefined;
  const displayValue = isControlled ? String(value) : undefined;
  const defaultDisplay =
    defaultValue === undefined || defaultValue === '' ? undefined : String(defaultValue);

  return (
    <label className="block space-y-1.5">
      <span className="flex flex-wrap items-center gap-2 text-sm font-medium">
        {label}
        {missing ? <MissingFieldHint /> : null}
      </span>
      {hint ? <span className="block text-xs text-muted-foreground">{hint}</span> : null}
      <div className="flex flex-wrap items-center gap-2">
        <input
          name={name}
          type="number"
          min={0}
          value={displayValue}
          defaultValue={isControlled ? undefined : defaultDisplay}
          onChange={isControlled ? (event) => onChange?.(event.target.value) : undefined}
          className={cn(
            'rounded-md border bg-background px-3 py-2 text-sm',
            adminFieldWidthClass('xs'),
            missing && 'border-amber-400 ring-1 ring-amber-200'
          )}
        />
        <span className="shrink-0 rounded-md border bg-muted px-2.5 py-2 text-xs font-semibold text-muted-foreground">
          {currency.code}
        </span>
      </div>
      <span className="block text-xs text-muted-foreground">
        {amountHint ?? `Guests see amounts in ${currency.label}.`}
      </span>
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
