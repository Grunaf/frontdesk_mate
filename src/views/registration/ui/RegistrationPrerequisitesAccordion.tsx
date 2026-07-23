'use client';

import { useState } from 'react';
import {
  EntryDateStepPanel,
  TourismGuestsRegistrationPanel,
  type TourismGuestListItem,
} from '@/features/guest-tourism-registration';
import { StayContactStepPanel } from '@/features/guest-stay-contact';
import { useTranslations } from '@/shared/i18n';
import { Button } from '@/shared/ui';
import { cn } from '@/shared/lib/utils';
import { HugeiconsIcon } from '@hugeicons/react';
import { ArrowDown01Icon, ArrowUp01Icon } from '@hugeicons/core-free-icons';
import type { RegistrationAccordionItem } from '../lib/resolveRegistrationAccordionItem';
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
  passportVerified?: boolean;
  value: RegistrationAccordionItem;
  onValueChange: (value: RegistrationAccordionItem) => void;
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
  placement,
}: {
  items: AccordionSectionItem[];
  activeId: RegistrationAccordionItem;
  onValueChange: (value: RegistrationAccordionItem) => void;
  /** Top: previous + active; bottom: following sections. */
  placement: 'top' | 'next';
}) {
  if (items.length === 0) {
    return null;
  }

  return (
    <div
      className={cn('shrink-0', placement === 'next' && 'pt-4')}
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
              if (!isActive) {
                onValueChange(item.id);
              }
            }}
            className={cn(
              'h-auto min-h-12 w-full justify-between gap-6 rounded-none border-0 border-t border-border/60 px-2 py-3 text-left text-base font-semibold hover:bg-transparent hover:no-underline',
              isActive
                ? 'text-foreground'
                : item.complete
                  ? 'text-foreground/80'
                  : 'text-foreground',
              placement === 'top' && 'first:border-t-0'
            )}
          >
            <span>{item.label}</span>
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
  passportVerified = false,
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

  const showIdentityStep = showIdentity && value === 'identity';
  const showEntryDateStep = showEntryDate && value === 'entryDate';

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

  const activeIndex = sectionItems.findIndex((item) => item.id === value);
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
      placement="top"
    />
  );
  const nextRow = (
    <AccordionSectionsRow
      items={nextItems}
      activeId={value}
      onValueChange={onValueChange}
      placement="next"
    />
  );

  return (
    <div className={cn('flex min-h-0 flex-1 flex-col', className)}>
      {topRow}
      {showIdentityStep ? (
        <TourismGuestsRegistrationPanel
          className="min-h-0 flex-1"
          interactionEnabled={interactionEnabled}
          navigationMode={navigationMode}
          showIntroHeading={false}
          showPassportWaiting={
            tourismComplete && entryDateComplete && contactComplete && !passportVerified
          }
          initialGuests={tourismGuests}
          initialRegistrationComplete={initialTourismComplete}
          onGuestsChange={setTourismGuests}
          onComplete={onTourismComplete}
        />
      ) : showEntryDateStep ? (
        <EntryDateStepPanel
          className="min-h-0 flex-1"
          tenantSlug={tenantSlug}
          entryDateComplete={entryDateComplete}
          interactionEnabled={interactionEnabled}
          navigationMode={navigationMode}
          showIntroHeading={false}
          guests={tourismGuests}
          onComplete={onEntryDateComplete}
          onBack={entryDateBack}
        />
      ) : (
        <div className="min-h-0 flex-1 overflow-y-auto">
          <StayContactStepPanel
            tenantSlug={tenantSlug}
            initialContactWhatsapp={stayContactWhatsapp}
            contactComplete={contactComplete}
            interactionEnabled={interactionEnabled}
            navigationMode={navigationMode}
            showIntroHeading={false}
            onDraftChange={onContactDraftChange}
            onComplete={onContactComplete}
            onBack={contactBack}
          />
        </div>
      )}
      {nextRow}
    </div>
  );
}
