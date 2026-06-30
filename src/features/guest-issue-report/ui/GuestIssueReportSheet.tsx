'use client';

import { useMemo, useState, useTransition } from 'react';
import { formatStayReference } from '@/entities/guest-stay';
import { GUEST_ISSUE_CATEGORIES, type GuestIssueCategory } from '@/entities/guest-issue';
import { resolveGuestStayPlan, useTenant } from '@/entities/tenant';
import { resolveReceptionContact } from '@/entities/tenant/lib/resolveReceptionContact';
import { CheckInRequiredSheet, useGuestSession, useIsGuestRegistered } from '@/features/guest-check-in';
import { formatBedLocationLine } from '@/features/find-your-bed/lib/formatBedLocation';
import { FindYourBedSummary } from '@/features/find-your-bed/ui/FindYourBedSummary';
import { ReceptionContactActions, useReceptionContactLabels } from '@/features/reception-contact';
import { useTranslations } from '@/shared/i18n';
import { cn } from '@/shared/lib/utils';
import {
  BottomSheet,
  BottomSheetBody,
  BOTTOM_SHEET_SIZES,
  BottomSheetContent,
  BottomSheetFooter,
  BottomSheetHeader,
  BottomSheetTitle,
  Button,
  SegmentedChipBar,
} from '@/shared/ui';
import { createGuestIssueAction } from '../actions/guestIssueActions';

const CATEGORY_ITEMS = GUEST_ISSUE_CATEGORIES.map((id) => ({ id, label: id }));

interface GuestIssueReportSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function GuestIssueReportSheet({ open, onOpenChange }: GuestIssueReportSheetProps) {
  const { name, hostel, settings, slug: tenantSlug } = useTenant();
  const { session } = useGuestSession();
  const isRegistered = useIsGuestRegistered();
  const t = useTranslations('components.guestIssue');
  const tBed = useTranslations('components.findYourBed');
  const receptionLabels = useReceptionContactLabels();
  const [category, setCategory] = useState<GuestIssueCategory | null>(null);
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [successStayRef, setSuccessStayRef] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const plan = useMemo(
    () => resolveGuestStayPlan(settings, session?.bedId),
    [settings, session?.bedId]
  );
  const stayRef = session?.stayId ? formatStayReference(session.stayId) : null;

  const categoryItems = useMemo(
    () =>
      CATEGORY_ITEMS.map((item) => ({
        id: item.id,
        label: t(`categories.${item.id}`),
      })),
    [t]
  );

  const receptionContact = useMemo(
    () =>
      resolveReceptionContact(hostel, {
        message: t('successWhatsappMessage', { hostelName: name }),
        urgency: 'low',
        translate: receptionLabels.translateHint,
      }),
    [hostel, name, receptionLabels.translateHint, t]
  );

  const resetForm = () => {
    setCategory(null);
    setNote('');
    setError(null);
    setSuccessStayRef(null);
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      resetForm();
    }
    onOpenChange(nextOpen);
  };

  const resolveErrorMessage = (code: string): string => {
    switch (code) {
      case 'unauthorized':
        return t('errors.unauthorized');
      case 'too_many_open':
        return t('errors.tooManyOpen');
      case 'note_too_long':
        return t('errors.noteTooLong');
      case 'invalid_category':
        return t('errors.invalidCategory');
      case 'db_unavailable':
        return t('errors.dbUnavailable');
      default:
        return t('errors.generic');
    }
  };

  const handleSubmit = () => {
    if (!session?.stayId) {
      return;
    }

    if (!category) {
      setError(t('errors.categoryRequired'));
      return;
    }

    setError(null);

    startTransition(async () => {
      const result = await createGuestIssueAction({
        tenantSlug,
        stayId: session.stayId,
        category,
        note: note.trim() || undefined,
      });

      if (!result.ok) {
        setError(resolveErrorMessage(result.error));
        return;
      }

      setSuccessStayRef(stayRef);
    });
  };

  if (!open) {
    return null;
  }

  if (!isRegistered) {
    return <CheckInRequiredSheet open={open} onOpenChange={handleOpenChange} />;
  }

  return (
    <BottomSheet open={open} onOpenChange={handleOpenChange}>
      <BottomSheetContent size={BOTTOM_SHEET_SIZES.large} className="flex flex-col px-0 pb-0">
        <BottomSheetHeader className="px-6 pb-3">
          <BottomSheetTitle className="text-base leading-snug">
            {successStayRef ? t('successTitle') : t('sheetTitle')}
          </BottomSheetTitle>
        </BottomSheetHeader>

        <BottomSheetBody className="space-y-4 pb-4">
          {successStayRef ? (
            <div className="space-y-3">
              <p className="text-sm leading-relaxed text-foreground">
                {t('successBody', { stayRef: successStayRef })}
              </p>
              <p className="text-sm leading-relaxed text-muted-foreground">{t('successUrgent')}</p>
            </div>
          ) : (
            <>
              <p className="text-sm leading-relaxed text-muted-foreground">{t('sheetDescription')}</p>

              <div className="rounded-xl border bg-muted/30 p-3">
                <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                  {t('sendPreviewHeading')}
                </p>
                <div className="mt-2 space-y-1">
                  {plan.bedId ? <FindYourBedSummary plan={plan} variant="breadcrumb" /> : null}
                  {stayRef ? (
                    <p className="font-mono text-sm font-semibold tracking-wide text-foreground">
                      {t('stayRefLabel')} #{stayRef}
                    </p>
                  ) : null}
                </div>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{t('privacyNotice')}</p>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                  {t('categoryLabel')}
                </p>
                <SegmentedChipBar
                  items={categoryItems}
                  value={category ?? ''}
                  onValueChange={(value) => setCategory(value as GuestIssueCategory)}
                  ariaLabel={t('categoryLabel')}
                />
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="guest-issue-note"
                  className="text-xs font-medium tracking-wide text-muted-foreground uppercase"
                >
                  {t('noteLabel')}
                </label>
                <textarea
                  id="guest-issue-note"
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  placeholder={t('notePlaceholder')}
                  maxLength={500}
                  rows={3}
                  className={cn(
                    'flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none',
                    'placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30'
                  )}
                />
                <p className="text-xs text-muted-foreground">{t('noteOptional')}</p>
              </div>

              {error ? <p className="text-sm text-destructive">{error}</p> : null}
            </>
          )}
        </BottomSheetBody>

        <BottomSheetFooter className="border-t border-border/60">
          {successStayRef ? (
            <div className="flex w-full flex-col gap-2">
              {receptionContact ? (
                <ReceptionContactActions
                  contact={receptionContact}
                  labels={{ message: receptionLabels.message, call: receptionLabels.call }}
                  whatsappVariant="primary"
                  callButtonSize="default"
                  analyticsContext="issue"
                  tenantSlug={tenantSlug}
                />
              ) : null}
              <Button type="button" variant="outline" className="w-full" onClick={() => handleOpenChange(false)}>
                {t('successClose')}
              </Button>
            </div>
          ) : (
            <Button
              type="button"
              className="w-full"
              disabled={isPending || !category}
              onClick={handleSubmit}
            >
              {isPending ? t('submitting') : t('submitButton')}
            </Button>
          )}
        </BottomSheetFooter>
      </BottomSheetContent>
    </BottomSheet>
  );
}
