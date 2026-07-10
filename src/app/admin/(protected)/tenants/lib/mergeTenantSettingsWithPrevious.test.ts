import { describe, expect, it } from 'vitest';
import type { TenantSettings } from '@/entities/tenant';
import { mergeTenantSettingsWithPrevious } from './mergeTenantSettingsWithPrevious';

describe('mergeTenantSettingsWithPrevious', () => {
  const previous: TenantSettings = {
    checkInTime: '14:00',
    checkOutTime: '11:00',
    contacts: {
      phoneRaw: '38761111222',
      address: 'Old address',
    },
    wifi: {
      name: 'HostelNet',
      password: 'secret',
    },
    reception: {
      open: '08:00',
      close: '22:00',
      whatsappEnabled: true,
    },
    booking: { provider: 'cloudbeds', engineId: 'test' },
  };

  it('preserves contacts and check-in when only wifi fields are submitted', () => {
    const formData = new FormData();
    formData.set('wifiName', 'NewNet');
    formData.set('wifiPassword', 'newpass');

    const incoming: TenantSettings = {
      checkInTime: undefined,
      contacts: { phoneRaw: undefined, address: undefined },
      wifi: { name: 'NewNet', password: 'newpass' },
      reception: { whatsappEnabled: false },
      booking: { provider: 'none' },
    };

    const merged = mergeTenantSettingsWithPrevious(formData, incoming, previous);

    expect(merged.checkInTime).toBe('14:00');
    expect(merged.contacts?.phoneRaw).toBe('38761111222');
    expect(merged.contacts?.address).toBe('Old address');
    expect(merged.wifi?.name).toBe('NewNet');
    expect(merged.reception?.open).toBe('08:00');
    expect(merged.reception?.whatsappEnabled).toBe(true);
    expect(merged.booking?.provider).toBe('cloudbeds');
  });

  it('updates address when arrival fields are submitted without phone', () => {
    const formData = new FormData();
    formData.set('address', 'New street 1');
    formData.set('mapsUrl', 'https://maps.example/new');

    const incoming: TenantSettings = {
      contacts: {
        phoneRaw: undefined,
        address: 'New street 1',
        mapsUrl: 'https://maps.example/new',
      },
    };

    const merged = mergeTenantSettingsWithPrevious(formData, incoming, previous);

    expect(merged.contacts?.phoneRaw).toBe('38761111222');
    expect(merged.contacts?.address).toBe('New street 1');
    expect(merged.contacts?.mapsUrl).toBe('https://maps.example/new');
  });

  it('applies phone when contacts section is mounted', () => {
    const formData = new FormData();
    formData.set('phoneRaw', '38769999999');
    formData.set('phoneMask', '');
    formData.set('phoneFormatPreset', 'auto');

    const incoming: TenantSettings = {
      contacts: {
        phoneRaw: '38769999999',
        phoneMask: '',
        phoneFormatPreset: 'auto',
      },
    };

    const merged = mergeTenantSettingsWithPrevious(formData, incoming, previous);

    expect(merged.contacts?.phoneRaw).toBe('38769999999');
  });

  it('applies social and guest chat fields from hidden payload', () => {
    const formData = new FormData();
    formData.set('instagram', 'myhostel');
    formData.set('facebook', '@myhostel');
    formData.set('guestChatUrl', 'https://chat.whatsapp.com/example');

    const incoming: TenantSettings = {
      contacts: {
        instagram: 'myhostel',
        facebook: '@myhostel',
        guestChatUrl: 'https://chat.whatsapp.com/example',
      },
    };

    const merged = mergeTenantSettingsWithPrevious(formData, incoming, previous);

    expect(merged.contacts?.instagram).toBe('myhostel');
    expect(merged.contacts?.facebook).toBe('@myhostel');
    expect(merged.contacts?.guestChatUrl).toBe('https://chat.whatsapp.com/example');
    expect(merged.contacts?.phoneRaw).toBe('38761111222');
  });
});
