import { describe, expect, it } from 'vitest';
import { formatBedLocationLine, formatBedLocationSegments } from './formatBedLocation';
import { resolveGuestStayPlan } from '@/entities/tenant/lib/resolveGuestStayPlan';

const messages: Record<string, string> = {
  floorLabel: 'Floor {floor}',
  roomLabel: 'Room {room}',
  bedLabel: 'Bed {bed}',
  bedWithTier: '{slot} · {tier}',
  bedTierUpper: 'upper',
  bedTierLower: 'lower',
};

function t(
  key: 'floorLabel' | 'roomLabel' | 'bedLabel' | 'bedWithTier' | 'bedTierUpper' | 'bedTierLower',
  values?: Record<string, string | number>
): string {
  let message = messages[key] ?? key;
  if (values) {
    for (const [name, value] of Object.entries(values)) {
      message = message.replace(`{${name}}`, String(value));
    }
  }
  return message;
}

describe('formatBedLocationLine', () => {
  it('joins localized floor, room, and bed segments', () => {
    const plan = resolveGuestStayPlan(
      {
        guestStay: {
          floors: [{ id: '1', label: '1' }],
          rooms: [{ id: 'r1', label: 'Dorm A', floorId: '1' }],
          beds: [{ id: '4B', roomId: 'r1', x: 1, y: 2 }],
        },
      },
      '4B'
    );

    expect(formatBedLocationLine(t, plan)).toBe('Floor 1 · Room Dorm A · Bed 1');
  });

  it('localizes bunk tier in bed segment', () => {
    const plan = resolveGuestStayPlan(
      {
        guestStay: {
          floors: [{ id: '1', label: '2' }],
          rooms: [{ id: 'r1', label: 'Vega', floorId: '1' }],
          beds: [
            {
              id: 'bunk-1',
              roomId: 'r1',
              bedType: 'bunk',
              topId: 'top-1',
              bottomId: 'bot-1',
            },
          ],
        },
      },
      'top-1'
    );

    expect(formatBedLocationSegments(t, plan)).toEqual([
      'Floor 2',
      'Room Vega',
      'Bed 1 · upper',
    ]);
  });
});
