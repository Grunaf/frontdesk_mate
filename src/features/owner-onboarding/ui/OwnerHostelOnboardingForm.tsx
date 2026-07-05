'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import type { CityPackSelectOption } from '@/entities/city-pack';
import { normalizeTenantSlugInput } from '@/shared/config';
import { useTranslations } from '@/shared/i18n';
import { Button, Input, Label } from '@/shared/ui';
import {
  createOwnerHostelAction,
  type CreateOwnerHostelFormState,
} from '../api/createOwnerHostelAction';

const initialState: CreateOwnerHostelFormState = { error: null };

interface OwnerHostelOnboardingFormProps {
  locale: string;
  cityPacks: CityPackSelectOption[];
}

export function OwnerHostelOnboardingForm({ locale, cityPacks }: OwnerHostelOnboardingFormProps) {
  const t = useTranslations('pages.owner.onboarding');
  const [state, formAction, isPending] = useActionState(
    createOwnerHostelAction.bind(null, locale),
    initialState
  );

  return (
    <div className="w-full space-y-6">
      <form action={formAction} className="space-y-5 rounded-xl border bg-background p-6">
        <label className="block space-y-2">
          <Label htmlFor="owner-hostel-name">{t('displayName')}</Label>
          <Input
            id="owner-hostel-name"
            name="name"
            autoComplete="organization"
            placeholder={t('displayNamePlaceholder')}
            required
            className="min-h-11 text-base"
          />
        </label>

        <label className="block space-y-2">
          <Label htmlFor="owner-hostel-slug">{t('slug')}</Label>
          <p className="text-xs text-muted-foreground">
            {t('slugHint', {
              landingHost: '{slug}.yourdomain.com',
              appHost: '{slug}.app.yourdomain.com',
            })}
          </p>
          <Input
            id="owner-hostel-slug"
            name="slug"
            autoComplete="off"
            placeholder={t('slugPlaceholder')}
            required
            className="min-h-11 text-base"
            onChange={(event) => {
              const normalized = normalizeTenantSlugInput(event.target.value);
              if (normalized !== event.target.value) {
                event.target.value = normalized;
              }
            }}
          />
        </label>

        <label className="block space-y-2">
          <Label htmlFor="owner-hostel-city-pack">{t('cityPack')}</Label>
          <p className="text-xs text-muted-foreground">{t('cityPackHint')}</p>
          <select
            id="owner-hostel-city-pack"
            name="cityPackId"
            required
            defaultValue=""
            className="flex min-h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="" disabled>
              {t('cityPackPlaceholder')}
            </option>
            {cityPacks.map((pack) => (
              <option key={pack.id} value={pack.id}>
                {pack.label}
              </option>
            ))}
          </select>
        </label>

        {state.error ? (
          <p className="text-sm text-destructive" role="alert">
            {state.error}
          </p>
        ) : null}

        <Button type="submit" className="min-h-11 w-full text-base" disabled={isPending || cityPacks.length === 0}>
          {isPending ? t('submitPending') : t('submit')}
        </Button>

        {cityPacks.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t('noCityPacks')}</p>
        ) : null}
      </form>

      <p className="text-center text-sm text-muted-foreground">
        {t('missingCity')}{' '}
        <Link
          href={`/${locale}/onboarding/city-request`}
          className="font-medium text-primary underline-offset-4 hover:underline"
        >
          {t('requestCityLink')}
        </Link>
      </p>
    </div>
  );
}
