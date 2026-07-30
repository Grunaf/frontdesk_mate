'use client';

import { useState } from 'react';
import {
  EntryDateStepPanel,
  TourismGuestsRegistrationPanel,
  type TourismGuestListItem,
} from '@/features/guest-tourism-registration';
import { StayContactStepPanel } from '@/features/guest-stay-contact';
import { useTranslations } from '@/shared/i18n';
import { Badge, Button } from '@/shared/ui';
import { cn } from '@/shared/lib/utils';
import { HugeiconsIcon } from '@hugeicons/react';
import { ArrowDown01Icon, ArrowUp01Icon } from '@hugeicons/core-free-icons';
import type {
  RegistrationAccordionItem,
  RegistrationAccordionOpenValue,
} from '../lib/resolveRegistrationAccordionItem';
import {
  isRegistrationContactAccordionDisabled,
  isRegistrationEntryDateAccordionDisabled,
  shouldShowRegistrationEntryDateAccordionItem,
  shouldShowRegistrationIdentityAccordionItem,
} from '../lib/resolveRegistrationAccordionItem';

import type { RegistrationSurface } from '../lib/registrationSurface';

type RegistrationPrerequisitesAccordionProps = {
  tourismRequired: boolean;
  tourismComplete: boolean;
  entryDateComplete: boolean;
  contactComplete: boolean;
  value: RegistrationAccordionOpenValue;
  onValueChange: (value: RegistrationAccordionOpenValue) => void;
  interactionEnabled: boolean;
  tenantSlug: string;
  stayContactWhatsapp: string | null;
  /** SSR guest list — skips client waterfall skeleton on first paint. */
  initialTourismGuests?: TourismGuestListItem[];
  initialTourismComplete?: boolean;
  onTourismComplete: () => void;
  onEntryDateComplete: (savedDate: string | null) => void;
  onContactComplete: (savedWhatsapp: string) => void;
  onContactDraftChange?: (draft: string) => void;
  onContactEditingChange?: (editing: boolean) => void;
  registrationSurface?: RegistrationSurface;
  className?: string;
};

type AccordionSectionItem = {
  id: RegistrationAccordionItem;
  label: string;
  disabled: boolean;
  complete: boolean;
};

function AccordionSectionsRow({
  items,
  activeId,
  onValueChange,
  allowCollapse,
  placement,
  doneBadgeLabel,
}: {
  items: AccordionSectionItem[];
  activeId: RegistrationAccordionOpenValue;
  onValueChange: (value: RegistrationAccordionOpenValue) => void;
  /** When true, clicking the active header collapses all sections. */
  allowCollapse: boolean;
  /** Top: previous + active; bottom: following sections. */
  placement: 'top' | 'next';
  doneBadgeLabel: string;
}) {
  if (items.length === 0) {
    return null;
  }

  return (
    <div
      className="shrink-0"
      role="tablist"
      aria-label={
        placement === 'top' ? 'Registration sections' : 'Next registration sections'
      }
    >
      {items.map((item) => {
        const isActive = item.id === activeId;
        return (
          <Button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            variant="ghost"
            disabled={item.disabled}
            onClick={() => {
              if (isActive) {
                if (allowCollapse) {
                  onValueChange(null);
                }
                return;
              }
              onValueChange(item.id);
            }}
            className={cn(
              'h-auto min-h-12 w-full justify-between gap-6 rounded-none border-0 border-t border-border/60 px-0 py-3 text-left text-base font-semibold hover:bg-transparent hover:no-underline lg:px-0',
              isActive
                ? 'text-foreground'
                : item.complete
                  ? 'text-foreground/80'
                  : 'text-foreground',
              placement === 'top' && 'first:border-t-0'
            )}
          >
            <span className="inline-flex min-w-0 items-center gap-2">
              <span className="truncate">{item.label}</span>
              {item.complete ? <Badge variant="muted">{doneBadgeLabel}</Badge> : null}
            </span>
            <HugeiconsIcon
              icon={isActive ? ArrowUp01Icon : ArrowDown01Icon}
              strokeWidth={2}
              className="size-4 shrink-0 text-muted-foreground"
              aria-hidden
            />
          </Button>
        );
      })}
    </div>
  );
}

export function RegistrationPrerequisitesAccordion({
  tourismRequired,
  tourismComplete,
  entryDateComplete,
  contactComplete,
  value,
  onValueChange,
  interactionEnabled,
  tenantSlug,
  stayContactWhatsapp,
  initialTourismGuests,
  initialTourismComplete,
  onTourismComplete,
  onEntryDateComplete,
  onContactComplete,
  onContactDraftChange,
  onContactEditingChange,
  registrationSurface = 'standalone',
  className,
}: RegistrationPrerequisitesAccordionProps) {
  const navigationMode = registrationSurface;
  const t = useTranslations('pages.staySetup.tabs');
  /** Shared live list: Identity updates → Entry Date reads without refetch. */
  const [tourismGuests, setTourismGuests] = useState<TourismGuestListItem[]>(
    () => initialTourismGuests ?? []
  );

  const showIdentity = shouldShowRegistrationIdentityAccordionItem(tourismRequired);
  const showEntryDate = shouldShowRegistrationEntryDateAccordionItem(tourismRequired);
  const entryDateLocked = isRegistrationEntryDateAccordionDisabled(
    tourismRequired,
    tourismComplete
  );
  const contactLocked = isRegistrationContactAccordionDisabled(
    tourismRequired,
    tourismComplete,
    entryDateComplete
  );

  const collapsed = value === null;
  const showIdentityStep = showIdentity && value === 'identity';
  const showEntryDateStep = showEntryDate && value === 'entryDate';
  const showContactStep = value === 'contact';
  const allComplete =
    contactComplete && (!tourismRequired || (tourismComplete && entryDateComplete));

  const entryDateBack = showIdentity ? () => onValueChange('identity') : undefined;
  const contactBack = showEntryDate
    ? () => onValueChange('entryDate')
    : showIdentity
      ? () => onValueChange('identity')
      : undefined;

  const sectionItems: AccordionSectionItem[] = [];
  if (showIdentity) {
    sectionItems.push({
      id: 'identity',
      label: t('identity'),
      disabled: false,
      complete: tourismComplete,
    });
  }
  if (showEntryDate) {
    sectionItems.push({
      id: 'entryDate',
      label: t('entryDate'),
      disabled: entryDateLocked,
      complete: entryDateComplete,
    });
  }
  sectionItems.push({
    id: 'contact',
    label: t('contact'),
    disabled: contactLocked,
    complete: contactComplete,
  });

  const activeIndex = collapsed ? -1 : sectionItems.findIndex((item) => item.id === value);
  const topItems = activeIndex >= 0 ? sectionItems.slice(0, activeIndex + 1) : sectionItems;
  const nextItems =
    activeIndex >= 0 && activeIndex < sectionItems.length - 1
      ? sectionItems.slice(activeIndex + 1)
      : [];

  const topRow = (
    <AccordionSectionsRow
      items={topItems}
      activeId={value}
      onValueChange={onValueChange}
      allowCollapse={allComplete}
      placement="top"
      doneBadgeLabel={t('doneBadge')}
    />
  );
  const nextRow = (
    <AccordionSectionsRow
      items={nextItems}
      activeId={value}
      onValueChange={onValueChange}
      allowCollapse={allComplete}
      placement="next"
      doneBadgeLabel={t('doneBadge')}
    />
  );

  return (
    <div className={cn('flex min-h-0 flex-1 flex-col', className)}>
      {topRow}
      <div className="relative min-h-0 flex-1">
        <div className="h-full min-h-0 overflow-y-auto">
          {showIdentityStep ? (
            <TourismGuestsRegistrationPanel
              interactionEnabled={interactionEnabled}
              navigationMode={navigationMode}
              showIntroHeading={false}
              initialGuests={tourismGuests}
              initialRegistrationComplete={initialTourismComplete}
              onGuestsChange={setTourismGuests}
              onComplete={onTourismComplete}
            />
          ) : showEntryDateStep ? (
            <EntryDateStepPanel
              tenantSlug={tenantSlug}
              entryDateComplete={entryDateComplete}
              interactionEnabled={interactionEnabled}
              navigationMode={navigationMode}
              showIntroHeading={false}
              guests={tourismGuests}
              onComplete={onEntryDateComplete}
              onBack={entryDateBack}
            />
          ) : showContactStep ? (
            <StayContactStepPanel
              tenantSlug={tenantSlug}
              initialContactWhatsapp={stayContactWhatsapp}
              contactComplete={contactComplete}
              interactionEnabled={interactionEnabled}
              navigationMode={navigationMode}
              showIntroHeading={false}
              onDraftChange={onContactDraftChange}
              onEditingChange={onContactEditingChange}
              onComplete={onContactComplete}
              onBack={contactBack}
            />
          ) : null}
        </div>
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-6 bg-gradient-to-t from-background to-transparent"
        />
      </div>
      {nextRow}
    </div>
  );
}
