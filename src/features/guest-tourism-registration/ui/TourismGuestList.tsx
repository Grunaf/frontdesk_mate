'use client';

import type { TourismGuestListItem } from '../actions/listTourismGuestsForSessionAction';
import { useTranslations } from '@/shared/i18n';
import { Badge, Card, CardContent } from '@/shared/ui';

type TourismGuestListProps = {
  guests: TourismGuestListItem[];
};

export function TourismGuestList({ guests }: TourismGuestListProps) {
  const t = useTranslations('pages.staySetup.register.guestList');

  if (guests.length === 0) {
    return <p className="text-sm text-muted-foreground">{t('empty')}</p>;
  }

  return (
    <ul className="space-y-2">
      {guests.map((guest) => (
        <li key={guest.id}>
          <Card className="border-muted/80 shadow-none">
            <CardContent className="flex items-center justify-between gap-3 p-3">
              <span className="text-sm font-medium text-foreground">
                {guest.firstName} {guest.lastName}
              </span>
              <Badge variant="secondary" className="shrink-0 font-normal">
                {t('photosUploaded')}
              </Badge>
            </CardContent>
          </Card>
        </li>
      ))}
    </ul>
  );
}
