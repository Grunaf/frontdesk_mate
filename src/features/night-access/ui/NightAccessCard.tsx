'use client';

import { useTranslations } from '@/shared/i18n';
import { resolveArrivalAccessPlan, useHostelConfig, useTenant } from '@/entities/tenant';
import { useNightMode } from '@/shared/lib';
import { Badge, Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui';

export function NightAccessCard() {
  const t = useTranslations('components.nightAccess');
  const hostel = useHostelConfig();
  const { settings, guestBedId } = useTenant();
  const isNightMode = useNightMode();
  const plan = resolveArrivalAccessPlan(settings, hostel, isNightMode, guestBedId);

  const codedSteps = plan.steps.filter((step) => step.code);

  if (codedSteps.length === 0) {
    return null;
  }

  return (
    <Card className="animate-fade-in mx-4 border-0 bg-foreground text-background shadow-md">
      <CardHeader className="pb-2">
        <CardTitle className="text-xs tracking-wider text-primary uppercase">
          {t('title')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className={`grid gap-3 ${codedSteps.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
          {codedSteps.map((step) => (
            <Card
              key={step.id}
              className="border-border/40 bg-background/10 p-2.5 text-background shadow-none"
            >
              <Badge variant="muted" className="mb-1 bg-background/20 text-xs text-background/90 uppercase">
                {step.label}
              </Badge>
              <p className="font-mono text-sm font-bold">{step.code}</p>
            </Card>
          ))}
        </div>
        <CardDescription className="text-sm text-muted-foreground italic">
          {plan.layoutKind === 'direct_to_floor' ? t('descriptionHostelOnly') : t('description')}
        </CardDescription>
      </CardContent>
    </Card>
  );
}
