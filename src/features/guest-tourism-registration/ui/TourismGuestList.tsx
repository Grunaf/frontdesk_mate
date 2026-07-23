'use client';

import type { TourismGuestListItem } from '../actions/listTourismGuestsForSessionAction';
import type { TourismGuestDraft } from '../lib/tourismGuestDraftStorage';
import { useTranslations } from '@/shared/i18n';
import { Badge, Card, CardContent } from '@/shared/ui';
import { cn } from '@/shared/lib/utils';

type TourismGuestListProps = {
  guests: TourismGuestListItem[];
  draft?: TourismGuestDraft | null;
  onDraftClick?: () => void;
};

function draftDisplayName(draft: TourismGuestDraft, fallback: string): string {
  const first = draft.values.firstName.trim();
  const last = draft.values.lastName.trim();
  const name = `${first} ${last}`.trim();
  return name || fallback;
}

export function TourismGuestList({ guests, draft = null, onDraftClick }: TourismGuestListProps) {
  const t = useTranslations('pages.staySetup.register.guestList');

  if (guests.length === 0 && !draft) {
    return <p className="text-sm text-muted-foreground">{t('empty')}</p>;
  }

  return (
    <ul className="space-y-2">
      {draft ? (
        <li>
          <button
            type="button"
            className="w-full text-left"
            onClick={onDraftClick}
            disabled={!onDraftClick}
          >
            <Card
              className={cn(
                'border-dashed border-muted-foreground/40 shadow-none',
                onDraftClick && 'transition-colors hover:border-foreground/30'
              )}
            >
              <CardContent className="flex items-center justify-between gap-3 p-3">
                <span className="text-sm font-medium text-foreground">
                  {draftDisplayName(draft, t('draftUntitled'))}
                </span>
                <Badge variant="outline" className="shrink-0 font-normal">
                  {t('draftBadge')}
                </Badge>
              </CardContent>
            </Card>
          </button>
        </li>
      ) : null}

      {guests.map((guest) => (
        <li key={guest.id}>
          <Card className="border-muted/80 shadow-none">
            <CardContent className="flex items-center justify-between gap-3 p-3">
              <span className="text-sm font-medium text-foreground">
                {guest.firstName} {guest.lastName}
              </span>
              <Badge variant="secondary" className="shrink-0 font-normal">
                {t('savedBadge')}
              </Badge>
            </CardContent>
          </Card>
        </li>
      ))}
    </ul>
  );
}
