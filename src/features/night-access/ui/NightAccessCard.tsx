'use client';

import { useTranslations } from '@/shared/i18n';
import { HOSTEL_CONFIG } from '@/shared/config';
import { Badge, Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui';

export function NightAccessCard() {
  const t = useTranslations('components.nightAccess');
  const tPrivate = useTranslations('domains.hostel.inside.private');

  return (
    <Card className="animate-fade-in mx-4 border-0 bg-foreground text-background shadow-md">
      <CardHeader className="pb-2">
        <CardTitle className="text-[11px] tracking-wider text-primary uppercase">
          {t('title')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <Card className="border-border/40 bg-background/10 p-2.5 text-background shadow-none">
            <Badge variant="muted" className="mb-1 bg-background/20 text-[10px] text-background/90 uppercase">
              {tPrivate('mainDoorLabel')}
            </Badge>
            <p className="font-mono text-sm font-bold">{HOSTEL_CONFIG.doors.codes.mainDoor}</p>
          </Card>
          <Card className="border-border/40 bg-background/10 p-2.5 text-background shadow-none">
            <Badge variant="muted" className="mb-1 bg-background/20 text-[10px] text-background/90 uppercase">
              {tPrivate('hostelDoorLabel')}
            </Badge>
            <p className="font-mono text-sm font-bold">{HOSTEL_CONFIG.doors.codes.subDoor}</p>
          </Card>
        </div>
        <CardDescription className="text-[10px] text-muted-foreground italic">
          {t('description')}
        </CardDescription>
      </CardContent>
    </Card>
  );
}
