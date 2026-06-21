'use client';

import type { GuestStayPlan } from '@/entities/tenant';
import { useTranslations } from '@/shared/i18n';
import { formatBedLocationLine, formatBedLocationSegments } from '../lib/formatBedLocation';

interface FindYourBedSummaryProps {
  plan: GuestStayPlan;
  /** Inline text for compact teasers; breadcrumb for settlement header. */
  variant?: 'inline' | 'breadcrumb';
}

function BedLocationBreadcrumb({ plan }: { plan: GuestStayPlan }) {
  const t = useTranslations('components.findYourBed');
  const segments = formatBedLocationSegments(
    (key, values) => t(key, values as Record<string, string | number> | undefined),
    plan
  );

  if (segments.length === 0) {
    return null;
  }

  return (
    <p className="text-sm leading-snug">
      {segments.map((segment, index) => {
        const isLast = index === segments.length - 1;
        return (
          <span key={`${segment}-${index}`}>
            {index > 0 ? <span className="text-muted-foreground"> · </span> : null}
            <span className={isLast ? 'font-semibold text-foreground' : 'text-muted-foreground'}>
              {segment}
            </span>
          </span>
        );
      })}
    </p>
  );
}

export function FindYourBedSummary({ plan, variant = 'breadcrumb' }: FindYourBedSummaryProps) {
  const t = useTranslations('components.findYourBed');

  if (!plan.bedId) {
    return null;
  }

  const summaryLine = formatBedLocationLine(
    (key, values) => t(key, values as Record<string, string | number> | undefined),
    plan
  );

  if (variant === 'inline') {
    return (
      <span className="truncate text-xs font-medium text-foreground">{summaryLine}</span>
    );
  }

  return <BedLocationBreadcrumb plan={plan} />;
}
