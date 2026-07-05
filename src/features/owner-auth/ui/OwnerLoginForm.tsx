'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { createOwnerBrowserClient } from '@/shared/lib/db/supabase-owner-browser';
import { Button, Input, Label } from '@/shared/ui';

interface OwnerLoginFormProps {
  locale: string;
}

export function OwnerLoginForm({ locale }: OwnerLoginFormProps) {
  const router = useRouter();
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
        setErrorMessage('Sign in failed. Check your connection and try again.');
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border bg-background p-6">
      <label className="block space-y-1.5">
        <Label htmlFor="owner-login-email">Email</Label>
        <Input
          id="owner-login-email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@hostel.com"
          required
        />
      </label>
      <label className="block space-y-1.5">
        <Label htmlFor="owner-login-password">Password</Label>
        <Input
          id="owner-login-password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
        />
      </label>
      {errorMessage ? (
        <p className="text-sm text-destructive" role="alert">
          {errorMessage}
        </p>
      ) : null}
      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? 'Signing in…' : 'Sign in'}
      </Button>
      <p className="text-center text-sm text-muted-foreground">
        No account?{' '}
        <Link href={`/${locale}/signup`} className="font-medium text-primary underline-offset-4 hover:underline">
          Sign up
        </Link>
      </p>
    </form>
  );
}
