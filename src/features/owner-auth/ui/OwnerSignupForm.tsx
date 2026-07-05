'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { createOwnerBrowserClient } from '@/shared/lib/db/supabase-owner-browser';
import { useTranslations } from '@/shared/i18n';
import { Button, Input, Label } from '@/shared/ui';

interface OwnerSignupFormProps {
  locale: string;
}

export function OwnerSignupForm({ locale }: OwnerSignupFormProps) {
  const router = useRouter();
  const t = useTranslations('pages.owner.auth.signup');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [confirmEmailMessage, setConfirmEmailMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setErrorMessage(null);
    setConfirmEmailMessage(null);

    startTransition(async () => {
      try {
        const supabase = createOwnerBrowserClient();
        const redirectTo = `${window.location.origin}/${locale}/auth/callback`;
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: redirectTo },
        });

        if (error) {
          setErrorMessage(error.message);
          return;
        }

        if (data.session) {
          router.refresh();
          router.replace(`/${locale}/onboarding`);
          return;
        }

        setConfirmEmailMessage(t('confirmEmail'));
      } catch {
        setErrorMessage(t('connectionError'));
      }
    });
  }

  return (
    <div className="space-y-4">
      <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border bg-background p-6">
        <label className="block space-y-1.5">
          <Label htmlFor="owner-signup-email">{t('email')}</Label>
          <Input
            id="owner-signup-email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder={t('emailPlaceholder')}
            required
            className="min-h-11 text-base"
          />
        </label>
        <label className="block space-y-1.5">
          <Label htmlFor="owner-signup-password">{t('password')}</Label>
          <Input
            id="owner-signup-password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            minLength={6}
            required
            className="min-h-11 text-base"
          />
        </label>
        {errorMessage ? (
          <p className="text-sm text-destructive" role="alert">
            {errorMessage}
          </p>
        ) : null}
        {confirmEmailMessage ? (
          <p className="text-sm text-muted-foreground" role="status">
            {confirmEmailMessage}
          </p>
        ) : null}
        <Button type="submit" className="min-h-11 w-full text-base" disabled={isPending}>
          {isPending ? t('submitPending') : t('submit')}
        </Button>
        <p className="text-center text-sm text-muted-foreground">
          {t('hasAccount')}{' '}
          <Link
            href={`/${locale}/login`}
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            {t('signInLink')}
          </Link>
        </p>
      </form>
    </div>
  );
}
