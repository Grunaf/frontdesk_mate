import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import type { InitiativeListItem } from '@/entities/initiative';
import { PRIORITY_OPTIONS, STATUS_LABELS, STATUS_OPTIONS } from './initiative-ui';

interface InitiativeFormProps {
  action: (formData: FormData) => void | Promise<void>;
  submitLabel: string;
  cancelHref: string;
  error?: string;
  initiative?: InitiativeListItem;
}

export function InitiativeForm({
  action,
  submitLabel,
  cancelHref,
  error,
  initiative,
}: InitiativeFormProps) {
  return (
    <form action={action} className="space-y-5 rounded-xl border bg-background p-5">
      {initiative ? <input type="hidden" name="id" value={initiative.id} /> : null}

      {error ? (
        <p className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <div className="space-y-2">
        <Label htmlFor="initiative-title">Title *</Label>
        <Input
          id="initiative-title"
          name="title"
          required
          minLength={3}
          maxLength={140}
          defaultValue={initiative?.title ?? ''}
          placeholder="Initiative title"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="initiative-priority">Priority *</Label>
          <select
            id="initiative-priority"
            name="priority"
            defaultValue={initiative?.priority ?? 'P1'}
            className="h-9 w-full rounded-md border bg-background px-3 text-sm"
            required
          >
            {PRIORITY_OPTIONS.map((priority) => (
              <option key={priority} value={priority}>
                {priority}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="initiative-status">Status *</Label>
          <select
            id="initiative-status"
            name="status"
            defaultValue={initiative?.status ?? 'idea'}
            className="h-9 w-full rounded-md border bg-background px-3 text-sm"
            required
          >
            {STATUS_OPTIONS.map((status) => (
              <option key={status} value={status}>
                {STATUS_LABELS[status]}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="initiative-summary">Summary *</Label>
        <textarea
          id="initiative-summary"
          name="summary"
          required
          minLength={1}
          maxLength={2000}
          defaultValue={initiative?.summary ?? ''}
          placeholder="Short context and target outcome"
          rows={4}
          className="w-full rounded-md border bg-background px-3 py-2 text-sm"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="initiative-spec">Spec</Label>
        <textarea
          id="initiative-spec"
          name="spec"
          maxLength={30000}
          defaultValue={initiative?.spec ?? ''}
          placeholder="Acceptance criteria, edge cases, rollout notes"
          rows={8}
          className="w-full rounded-md border bg-background px-3 py-2 text-sm"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="initiative-tracked-paths">Tracked paths *</Label>
        <textarea
          id="initiative-tracked-paths"
          name="trackedPaths"
          required
          defaultValue={(initiative?.trackedPaths ?? []).join('\n')}
          placeholder="src/features/..."
          rows={6}
          className="w-full rounded-md border bg-background px-3 py-2 font-mono text-xs"
        />
        <p className="text-xs text-muted-foreground">One path per line.</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="initiative-tags">Tags</Label>
        <Input
          id="initiative-tags"
          name="tags"
          defaultValue={(initiative?.tags ?? []).join(', ')}
          placeholder="admin, onboarding"
        />
        <p className="text-xs text-muted-foreground">Comma-separated list, optional.</p>
      </div>

      <div className="flex items-center justify-end gap-2 border-t pt-4">
        <Button type="button" variant="ghost" asChild>
          <a href={cancelHref}>Cancel</a>
        </Button>
        <Button type="submit">{submitLabel}</Button>
      </div>
    </form>
  );
}
