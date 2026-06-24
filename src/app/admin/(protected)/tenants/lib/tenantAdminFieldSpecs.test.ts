import { describe, expect, it } from 'vitest';
import {
  isBookingEngineEnabled,
  isEngineRoomTypeIdRequired,
  shouldShowBookingEngineFields,
  shouldShowDualCurrency,
  shouldShowEngineRoomTypeId,
  shouldShowPhoneDisplayOptions,
  shouldShowReceptionWhatsappToggles,
} from './tenantAdminFieldSpecs';
import type { TenantSettings } from '@/entities/tenant';

describe('tenantAdminFieldSpecs', () => {
  it('hides booking engine fields when provider is none', () => {
    const settings: TenantSettings = { booking: { provider: 'none' } };
    expect(shouldShowBookingEngineFields(settings)).toBe(false);
    expect(shouldShowEngineRoomTypeId(settings)).toBe(false);
    expect(isEngineRoomTypeIdRequired(settings)).toBe(false);
  });

  it('shows engine room id when booking is enabled', () => {
    const settings: TenantSettings = {
      booking: { provider: 'cloudbeds', engineId: 'ABC' },
      landing: {
        roomTypes: [
          {
            id: 'dorm',
            engineRoomTypeId: 'DORM8',
            title: 'Dorm',
            description: '',
            imageUrl: '/img.jpg',
          },
        ],
      },
    };

    expect(isBookingEngineEnabled(settings)).toBe(true);
    expect(shouldShowEngineRoomTypeId(settings)).toBe(true);
    expect(isEngineRoomTypeIdRequired(settings)).toBe(true);
  });

  it('collapses phone display options when raw is empty', () => {
    expect(shouldShowPhoneDisplayOptions('', undefined)).toBe(false);
    expect(shouldShowPhoneDisplayOptions('', '38761111')).toBe(true);
    expect(shouldShowPhoneDisplayOptions('38761111')).toBe(true);
  });

  it('shows dual currency fields only in dual mode', () => {
    expect(shouldShowDualCurrency('primary')).toBe(false);
    expect(shouldShowDualCurrency('dual')).toBe(true);
  });

  it('shows reception whatsapp toggles when any phone exists', () => {
    expect(shouldShowReceptionWhatsappToggles({})).toBe(false);
    expect(
      shouldShowReceptionWhatsappToggles({ contacts: { phoneRaw: '38761111' } })
    ).toBe(true);
  });
});
