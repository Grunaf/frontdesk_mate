import { describe, expect, it } from 'vitest';
import {
  DEFAULT_GUEST_ACCESS_MESSAGE_TEMPLATE,
  resolveGuestAccessMessageTemplate,
} from '@/entities/tenant';
import { renderGuestAccessMessage } from './renderGuestAccessMessage';

const baseContext = {
  sendLink: 'https://vega.app.example/en/check-in?t=abc&entry=remote',
  pin: '123456',
  pinMissingText: 'Contact reception for your PIN.',
  guestName: 'Alex',
  hostelName: 'Vega Hostel',
};

describe('renderGuestAccessMessage', () => {
  it('substitutes all placeholders', () => {
    const result = renderGuestAccessMessage(
      'Hi {guestName} at {hostelName}. Link: {sendLink} PIN: {pin}',
      baseContext
    );

    expect(result).toContain('Hi Alex at Vega Hostel');
    expect(result).toContain(baseContext.sendLink);
    expect(result).toContain('123 456');
  });

  it('uses pin missing text when pin is absent', () => {
    const result = renderGuestAccessMessage('{pinOrHelp}', {
      ...baseContext,
      pin: null,
    });

    expect(result).toBe('Contact reception for your PIN.');
  });

  it('defaults guest name', () => {
    const result = renderGuestAccessMessage('Hello {guestName}', {
      ...baseContext,
      guestName: undefined,
    });

    expect(result).toBe('Hello Guest');
  });

  it('keeps preface lines that end with a colon and drops blank lines', () => {
    const result = renderGuestAccessMessage(resolveGuestAccessMessageTemplate(), {
      ...baseContext,
      pin: null,
    });

    expect(result).toContain('Before you travel, open this link for directions and arrival tips:');
    expect(result).toContain(
      'To unlock door codes and your room map, open the guest app on Concierge and tap Check in (top right), then use your PIN or personal link:'
    );
    expect(result).toContain(baseContext.sendLink);
    expect(result).toContain(baseContext.pinMissingText);
    expect(result).not.toContain('{bedLabel}');
    expect(result).not.toMatch(/\n\n/);
  });

  it('leaves unknown {bedLabel} literal in custom templates', () => {
    const result = renderGuestAccessMessage('Bed: {bedLabel}\nLink: {sendLink}', baseContext);

    expect(result).toContain('Bed: {bedLabel}');
    expect(result).toContain(`Link: ${baseContext.sendLink}`);
  });
});

describe('DEFAULT_GUEST_ACCESS_MESSAGE_TEMPLATE', () => {
  it('does not include bedLabel', () => {
    expect(DEFAULT_GUEST_ACCESS_MESSAGE_TEMPLATE).not.toContain('{bedLabel}');
    expect(DEFAULT_GUEST_ACCESS_MESSAGE_TEMPLATE).not.toMatch(/\bBed:/);
  });
});
