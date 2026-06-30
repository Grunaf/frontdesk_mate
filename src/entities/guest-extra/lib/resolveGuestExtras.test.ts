import { describe, expect, it } from 'vitest';
import type { HouseRule } from '@/entities/house-rules';
import {
  guestExtraSupportsSchedule,
  resolveGuestExtras,
  resolveGuestExtrasForGuest,
  resolveGuestExtrasLayout,
} from '@/entities/guest-extra';

describe('resolveGuestExtras', () => {
  it('includes laundry from laundryCost when guestExtras is unset', () => {
    const extras = resolveGuestExtras({ laundryCost: '10€' });
    expect(extras).toEqual([
      expect.objectContaining({
        presetId: 'laundry',
        kind: 'ops',
        priceLabel: '10€',
        tileVariant: 'standard',
      }),
    ]);
  });

  it('includes laundry from legacy house rule cost', () => {
    const legacyLaundryRule = {
      id: 'laundry',
      templateId: 'laundry',
      enabled: true,
      params: { cost: '8€' },
    } as unknown as HouseRule;

    const extras = resolveGuestExtras({
      houseRules: [legacyLaundryRule],
    });
    expect(extras[0]).toMatchObject({ presetId: 'laundry', priceLabel: '8€', tileVariant: 'standard' });
  });

  it('uses guestExtras when configured', () => {
    const extras = resolveGuestExtras({
      guestExtras: [
        {
          presetId: 'partner_transfer',
          enabled: true,
          highlight: true,
          imageUrl: 'https://example.com/transfer.jpg',
          priceLabel: '30€',
          externalUrl: 'https://example.com',
        },
      ],
    });
    expect(extras).toEqual([
      {
        presetId: 'partner_transfer',
        kind: 'partner',
        highlight: true,
        imageUrl: 'https://example.com/transfer.jpg',
        tileVariant: 'highlight',
        priceLabel: '30€',
        scheduleLabel: null,
        externalUrl: 'https://example.com',
        whatsappEnabled: true,
      },
    ]);
  });

  it('falls back to standard when highlight has no image', () => {
    const extras = resolveGuestExtras({
      guestExtras: [{ presetId: 'partner_transfer', enabled: true, highlight: true, priceLabel: '30€' }],
    });
    expect(extras[0]?.tileVariant).toBe('standard');
  });

  it('does not expose schedule for on-demand transfer', () => {
    const extras = resolveGuestExtras({
      guestExtras: [
        {
          presetId: 'partner_transfer',
          enabled: true,
          scheduleLabel: 'Daily 10:00',
        },
      ],
    });
    expect(extras[0]?.scheduleLabel).toBeNull();
  });

  it('shows schedule for partner tour when set', () => {
    const extras = resolveGuestExtras({
      guestExtras: [
        {
          presetId: 'partner_tour',
          enabled: true,
          scheduleLabel: 'Daily 10:00',
        },
      ],
    });
    expect(extras[0]?.scheduleLabel).toBe('Daily 10:00');
  });
});

describe('resolveGuestExtrasForGuest', () => {
  it('shows partner extras without registration', () => {
    const extras = resolveGuestExtrasForGuest(
      {
        guestExtras: [{ presetId: 'partner_transfer', enabled: true }],
      },
      false
    );
    expect(extras).toHaveLength(1);
  });

  it('hides ops extras without registration', () => {
    const extras = resolveGuestExtrasForGuest({ laundryCost: '10€' }, false);
    expect(extras).toHaveLength(0);
  });
});

describe('resolveGuestExtrasLayout', () => {
  it('splits featured strip and standard grid', () => {
    const layout = resolveGuestExtrasLayout(
      {
        guestExtras: [
          {
            presetId: 'partner_transfer',
            enabled: true,
            highlight: true,
            imageUrl: 'https://example.com/a.jpg',
          },
          { presetId: 'laundry', enabled: true, priceLabel: '10€' },
        ],
      },
      true
    );
    expect(layout.featured).toHaveLength(1);
    expect(layout.featured[0]?.presetId).toBe('partner_transfer');
    expect(layout.standard).toHaveLength(1);
    expect(layout.standard[0]?.presetId).toBe('laundry');
  });

  it('limits featured strip to four and standard grid to four', () => {
    const layout = resolveGuestExtrasLayout(
      {
        guestExtras: [
          {
            presetId: 'partner_transfer',
            enabled: true,
            highlight: true,
            imageUrl: 'https://example.com/1.jpg',
          },
          {
            presetId: 'partner_tour',
            enabled: true,
            highlight: true,
            imageUrl: 'https://example.com/2.jpg',
          },
          {
            presetId: 'partner_guide',
            enabled: true,
            highlight: true,
            imageUrl: 'https://example.com/3.jpg',
          },
          {
            presetId: 'early_checkin',
            enabled: true,
            highlight: true,
            imageUrl: 'https://example.com/4.jpg',
          },
          {
            presetId: 'late_checkout',
            enabled: true,
            highlight: true,
            imageUrl: 'https://example.com/5.jpg',
          },
          { presetId: 'laundry', enabled: true },
          { presetId: 'early_checkin', enabled: true },
          { presetId: 'late_checkout', enabled: true },
          { presetId: 'partner_tour', enabled: true },
          { presetId: 'partner_guide', enabled: true },
        ],
      },
      true
    );
    expect(layout.featured).toHaveLength(4);
    expect(layout.standard).toHaveLength(4);
  });

  it('excludes preset ids from concierge layout when requested', () => {
    const layout = resolveGuestExtrasLayout(
      {
        guestExtras: [
          { presetId: 'laundry', enabled: true },
          { presetId: 'late_checkout', enabled: true, priceLabel: '10€' },
          { presetId: 'partner_tour', enabled: true },
        ],
      },
      true,
      { excludePresetIds: ['late_checkout'] }
    );

    expect(layout.featured).toHaveLength(0);
    expect(layout.standard.map((extra) => extra.presetId)).toEqual(['laundry', 'partner_tour']);
  });
});

describe('guestExtraSupportsSchedule', () => {
  it('is false for partner transfer', () => {
    expect(guestExtraSupportsSchedule('partner_transfer')).toBe(false);
  });

  it('is true for partner tour', () => {
    expect(guestExtraSupportsSchedule('partner_tour')).toBe(true);
  });
});
