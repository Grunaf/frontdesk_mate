'use client';

import QRCode from 'qrcode';
import { useEffect, useMemo, useState } from 'react';
import { appendGuestEntryToMagicLink } from '@/entities/guest-stay/lib/buildMagicLinkUrl';
import { renderGuestAccessMessage } from '../lib/renderGuestAccessMessage';
import { Button } from '@/shared/ui';

interface MagicLinkCardProps {
  magicLinkUrl: string;
  bedId: string;
  bedLabel?: string;
  guestName?: string;
  guestPin?: string;
  hostelName: string;
  guestAccessMessageTemplate: string;
  guestAccessPinMissingText: string;
  onDismiss?: () => void;
}

function formatGuestPin(pin: string): string {
  const digits = pin.replace(/\D/g, '');
  if (digits.length !== 6) return pin;
  return `${digits.slice(0, 3)} ${digits.slice(3)}`;
}

function resolveSubtitle(guestName: string | undefined, bedLabel: string): string {
  if (guestName) {
    return `${guestName} · ${bedLabel}`;
  }
  return `${bedLabel} · copy message for Booking chat`;
}

type CopiedKind = 'message' | 'send' | 'onsite' | null;

export function MagicLinkCard({
  magicLinkUrl,
  bedId,
  bedLabel,
  guestName,
  guestPin,
  hostelName,
  guestAccessMessageTemplate,
  guestAccessPinMissingText,
  onDismiss,
}: MagicLinkCardProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState<CopiedKind>(null);

  const displayBedLabel = bedLabel?.trim() || bedId;

  const sendMagicLinkUrl = useMemo(
    () => appendGuestEntryToMagicLink(magicLinkUrl, 'remote'),
    [magicLinkUrl]
  );

  const onsiteMagicLinkUrl = useMemo(
    () => appendGuestEntryToMagicLink(magicLinkUrl, 'desk'),
    [magicLinkUrl]
  );

  const guestMessage = useMemo(
    () =>
      renderGuestAccessMessage(guestAccessMessageTemplate, {
        sendLink: sendMagicLinkUrl,
        pin: guestPin,
        pinMissingText: guestAccessPinMissingText,
        guestName,
        hostelName,
      }),
    [
      guestAccessMessageTemplate,
      sendMagicLinkUrl,
      guestPin,
      guestAccessPinMissingText,
      guestName,
      hostelName,
    ]
  );

  useEffect(() => {
    let cancelled = false;

    QRCode.toDataURL(onsiteMagicLinkUrl, { margin: 1, width: 220 })
      .then((url) => {
        if (!cancelled) setQrDataUrl(url);
      })
      .catch(() => {
        if (!cancelled) setQrDataUrl(null);
      });

    return () => {
      cancelled = true;
    };
  }, [onsiteMagicLinkUrl]);

  const copyText = async (value: string, kind: Exclude<CopiedKind, null>) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(kind);
      window.setTimeout(() => setCopied(null), 2000);
    } catch {
      setCopied(null);
    }
  };

  return (
    <div className="space-y-4 rounded-xl border border-primary/20 bg-primary/5 p-4">
      <div>
        <p className="text-sm font-semibold text-foreground">Guest access ready</p>
        <p className="text-xs text-muted-foreground">
          {resolveSubtitle(guestName, displayBedLabel)}
        </p>
      </div>

      {guestPin ? (
        <div className="rounded-lg border bg-background p-4 text-center">
          <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
            Paper PIN
          </p>
          <p className="mt-2 font-mono text-3xl font-bold tracking-[0.2em] text-foreground">
            {formatGuestPin(guestPin)}
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            Write this on the guest slip — works offline, syncs when they go online. Shown once.
          </p>
        </div>
      ) : (
        <p className="rounded-md border border-dashed px-3 py-2 text-xs text-muted-foreground">
          PIN was shown once when access was issued. The copy message below uses help text instead
          of a code — re-issue for a new PIN if needed.
        </p>
      )}

      <div className="space-y-2 rounded-lg border bg-background p-3">
        <p className="text-sm font-medium text-foreground">Before arrival</p>
        <p className="text-xs text-muted-foreground">
          Guest not here yet — paste into Booking chat (or WhatsApp). The link opens the arrival guide
          (directions and prep). PIN / link unlock the app via Check in on Concierge.
        </p>
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <Button type="button" size="sm" className="w-full sm:w-auto" onClick={() => copyText(guestMessage, 'message')}>
            {copied === 'message' ? 'Copied' : 'Copy message for guest'}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="w-full sm:w-auto"
            onClick={() => copyText(sendMagicLinkUrl, 'send')}
          >
            {copied === 'send' ? 'Copied' : 'Copy send link'}
          </Button>
        </div>
      </div>

      <details className="rounded-lg border bg-background px-3 py-2">
        <summary className="cursor-pointer text-sm font-medium text-foreground">
          At reception (on-site)
        </summary>
        <p className="mt-2 text-xs text-muted-foreground">
          For guests at the desk — QR opens Settlement after they use Check in with their PIN or link.
          Use for on-site handoff, not for Booking chat before travel.
        </p>
        {qrDataUrl ? (
          <div className="mt-3 flex justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={qrDataUrl}
              alt="On-site guest check-in QR code"
              className="rounded-lg border bg-white p-2"
            />
          </div>
        ) : null}
        <div className="mt-3 space-y-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => copyText(onsiteMagicLinkUrl, 'onsite')}
          >
            {copied === 'onsite' ? 'Copied' : 'Copy on-site link'}
          </Button>
        </div>
      </details>

      {onDismiss ? (
        <Button type="button" size="sm" variant="outline" onClick={onDismiss}>
          Done
        </Button>
      ) : null}
    </div>
  );
}
