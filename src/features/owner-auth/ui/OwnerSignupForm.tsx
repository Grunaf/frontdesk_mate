'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useTransition } from 'react';
import { createOwnerBrowserClient } from '@/shared/lib/db/supabase-owner-browser';
import { Button, Input, Label } from '@/shared/ui';

interface OwnerSignupFormProps {
  locale: string;
}

export function OwnerSignupForm({ locale }: OwnerSignupFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const hostelStep = searchParams.get('step') === 'hostel';

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
          router.replace(`/${locale}`);
          return;
        }

        setConfirmEmailMessage('Check your email to confirm your account, then sign in.');
      } catch {
        setErrorMessage('Sign up failed. Check your connection and try again.');
      }
    });
  }

  return (
    <div className="space-y-4">
      {hostelStep ? (
        <p className="rounded-lg border border-dashed bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
          Create your account first. Hostel setup ships in Module 3.
        </p>
      ) : null}

      <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border bg-background p-6">
        <label className="block space-y-1.5">
          <Label htmlFor="owner-signup-email">Email</Label>
          <Input
            id="owner-signup-email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@hostel.com"
            required
          />
        </label>
        <label className="block space-y-1.5">
          <Label htmlFor="owner-signup-password">Password</Label>
          <Input
            id="owner-signup-password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            minLength={6}
            required
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
        <Button type="submit" className="w-full" disabled={isPending}>
          {isPending ? 'Creating account…' : 'Sign up'}
        </Button>
        <p className="text-center text-sm text-muted-foreground">
          Already have an account?{' '}
          <Link
            href={`/${locale}/login`}
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            Sign in
          </Link>
        </p>
      </form>
    </div>
  );
}
