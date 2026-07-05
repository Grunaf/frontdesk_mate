'use client';

import { useActionState } from 'react';
import type { CityPackRequestKind } from '@/entities/city-pack-request';
import { useTranslations } from '@/shared/i18n';
import { Button, Input, Label } from '@/shared/ui';
import {
  submitCityPackRequestAction,
  type CityPackRequestFormState,
} from '../api/submitCityPackRequestAction';

const initialState: CityPackRequestFormState = { error: null };

const REQUEST_KINDS: CityPackRequestKind[] = ['new_city', 'pack_not_ready', 'other'];

const selectClassName =
  'flex min-h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

const textareaClassName =
  'flex min-h-[7rem] w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

interface CityPackRequestFormProps {
  locale: string;
  contactEmail: string;
  relatedCityPackId?: string;
  defaultRequestKind?: CityPackRequestKind;
}

export function CityPackRequestForm({
  locale,
  contactEmail,
  relatedCityPackId = '',
  defaultRequestKind = 'new_city',
}: CityPackRequestFormProps) {
  const t = useTranslations('pages.owner.cityRequest');
  const [state, formAction, isPending] = useActionState(
    submitCityPackRequestAction.bind(null, locale),
    initialState
  );

  const errorMessage =
    state.error === 'duplicate'
      ? t('error.duplicate')
      : state.error === 'validation'
        ? t('error.validation')
        : state.error === 'save'
          ? t('error.save')
          : null;

  return (
    <form action={formAction} className="space-y-5 rounded-xl border bg-background p-6">
      <input type="hidden" name="relatedCityPackId" value={relatedCityPackId} />

      <label className="block space-y-2">
        <Label htmlFor="city-request-kind">{t('form.requestKind')}</Label>
        <select
          id="city-request-kind"
          name="requestKind"
          required
          defaultValue={defaultRequestKind}
          className={selectClassName}
        >
          {REQUEST_KINDS.map((kind) => (
            <option key={kind} value={kind}>
              {t(`kind.${kind}`)}
            </option>
          ))}
        </select>
      </label>

      <label className="block space-y-2">
        <Label htmlFor="city-request-name">{t('form.cityName')}</Label>
        <Input
          id="city-request-name"
          name="cityName"
          autoComplete="address-level2"
          placeholder={t('form.cityNamePlaceholder')}
          required
          className="min-h-11 text-base"
        />
      </label>

      <label className="block space-y-2">
        <Label htmlFor="city-request-country">{t('form.countryOrRegion')}</Label>
        <Input
          id="city-request-country"
          name="countryOrRegion"
          autoComplete="country-name"
          placeholder={t('form.countryOrRegionPlaceholder')}
          className="min-h-11 text-base"
        />
      </label>

      <label className="block space-y-2">
        <Label htmlFor="city-request-message">{t('form.message')}</Label>
        <textarea
          id="city-request-message"
          name="message"
          maxLength={2000}
          placeholder={t('form.messagePlaceholder')}
          className={textareaClassName}
        />
      </label>

      <div className="space-y-2">
        <Label htmlFor="city-request-email">{t('form.contactEmail')}</Label>
        <Input
          id="city-request-email"
          name="contactEmailDisplay"
          value={contactEmail}
          readOnly
          tabIndex={-1}
          className="min-h-11 bg-muted/40 text-base"
        />
      </div>

      {errorMessage ? (
        <p className="text-sm text-destructive" role="alert">
          {errorMessage}
        </p>
      ) : null}

      <Button type="submit" className="min-h-11 w-full text-base" disabled={isPending}>
        {isPending ? t('form.submitPending') : t('form.submit')}
      </Button>
    </form>
  );
}
