'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { createOwnerBrowserClient } from '@/shared/lib/db/supabase-owner-browser';
import { useTranslations } from '@/shared/i18n';
import { Button, Input, Label } from '@/shared/ui';

interface OwnerLoginFormProps {
  locale: string;
}

export function OwnerLoginForm({ locale }: OwnerLoginFormProps) {
  const router = useRouter();
  const t = useTranslations('pages.owner.auth.login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setErrorMessage(null);

    startTransition(async () => {
      try {
        const supabase = createOwnerBrowserClient();
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
          setErrorMessage(error.message);
          return;
        }
        router.refresh();
        router.replace(`/${locale}`);
      } catch {
        setErrorMessage(t('connectionError'));
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border bg-background p-6">
      <label className="block space-y-1.5">
        <Label htmlFor="owner-login-email">{t('email')}</Label>
        <Input
          id="owner-login-email"
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
        <Label htmlFor="owner-login-password">{t('password')}</Label>
        <Input
          id="owner-login-password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
          className="min-h-11 text-base"
        />
      </label>
      {errorMessage ? (
        <p className="text-sm text-destructive" role="alert">
          {errorMessage}
        </p>
      ) : null}
      <Button type="submit" className="min-h-11 w-full text-base" disabled={isPending}>
        {isPending ? t('submitPending') : t('submit')}
      </Button>
      <p className="text-center text-sm text-muted-foreground">
        {t('noAccount')}{' '}
        <Link href={`/${locale}/signup`} className="font-medium text-primary underline-offset-4 hover:underline">
          {t('signUpLink')}
        </Link>
      </p>
    </form>
  );
}
