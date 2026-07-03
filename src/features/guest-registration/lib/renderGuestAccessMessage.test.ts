import { describe, expect, it } from 'vitest';
import { renderGuestAccessMessage } from './renderGuestAccessMessage';

const baseContext = {
  sendLink: 'https://vega.app.example/en/check-in?t=abc&entry=remote',
  pin: '123456',
  pinMissingText: 'Contact reception for your PIN.',
  guestName: 'Alex',
  hostelName: 'Vega Hostel',
  bedLabel: 'Room 2 · Bed B',
};

describe('renderGuestAccessMessage', () => {
  it('substitutes all placeholders', () => {
    const result = renderGuestAccessMessage(
      'Hi {guestName} at {hostelName}. Link: {sendLink} PIN: {pin} Bed {bedLabel}',
      baseContext
    );

    expect(result).toContain('Hi Alex at Vega Hostel');
    expect(result).toContain(baseContext.sendLink);
    expect(result).toContain('123 456');
    expect(result).toContain('Room 2 · Bed B');
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

  it('collapses empty lines when bed label is omitted', () => {
    const result = renderGuestAccessMessage('Bed: {bedLabel}\n\nLink: {sendLink}', {
      ...baseContext,
      bedLabel: '',
    });

    expect(result).not.toContain('Bed:');
    expect(result).toContain('Link:');
    expect(result).not.toMatch(/\n\n/);
  });
});
