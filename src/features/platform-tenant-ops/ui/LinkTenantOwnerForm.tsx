'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { Button, Input, Label } from '@/shared/ui';
import { linkTenantOwnerAction } from '../api/linkTenantOwnerAction';

type LinkTenantOwnerFormProps = {
  tenantId: string;
};

export function LinkTenantOwnerForm({ tenantId }: LinkTenantOwnerFormProps) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    startTransition(async () => {
      const result = await linkTenantOwnerAction({ tenantId, email });
      if (!result.ok) {
        setErrorMessage(result.message);
        return;
      }

      setSuccessMessage(
        result.invited
          ? `Invite sent to ${result.email}. Owner linked.`
          : `Linked existing account ${result.email}.`,
      );
      setEmail('');
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <label className="block space-y-1.5">
        <Label htmlFor="link-owner-email">Owner email</Label>
        <Input
          id="link-owner-email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="owner@hostel.com"
          required
          disabled={isPending}
          className="max-w-md"
        />
      </label>
      <p className="text-xs text-muted-foreground">
        Links this hostel to the account. If the email is new, sends a Supabase invite to the owner
        portal.
      </p>
      {errorMessage ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900">
          {errorMessage}
        </p>
      ) : null}
      {successMessage ? (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
          {successMessage}
        </p>
      ) : null}
      <Button type="submit" disabled={isPending || !email.trim()}>
        {isPending ? 'Linking…' : 'Link owner'}
      </Button>
    </form>
  );
}
