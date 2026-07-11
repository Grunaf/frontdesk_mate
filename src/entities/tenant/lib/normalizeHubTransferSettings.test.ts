import { describe, expect, it } from 'vitest';
import { normalizeHubTransferForSave } from './normalizeHubTransferSettings';
import { parseTenantSettingsFormData } from '../server/parseTenantSettingsFormData';

describe('normalizeHubTransferForSave', () => {
  it('dedupes and filters invalid categories', () => {
    const result = normalizeHubTransferForSave({
      enabledHubCategories: ['airport', 'bus', 'airport', 'ferry', 'train', 'bus'],
    });

    expect(result).toEqual({
      enabledHubCategories: ['airport', 'bus', 'train'],
    });
  });

  it('returns empty list for invalid input', () => {
    expect(normalizeHubTransferForSave(null)).toEqual({ enabledHubCategories: [] });
    expect(normalizeHubTransferForSave({ enabledHubCategories: 'airport' })).toEqual({
      enabledHubCategories: [],
    });
  });
});

describe('parseTenantSettingsFormData hubTransfer', () => {
  it('round-trips enabledHubCategories from hubTransferJson', () => {
    const formData = new FormData();
    formData.set(
      'hubTransferJson',
      JSON.stringify({ enabledHubCategories: ['train', 'airport', 'airport', 'invalid'] })
    );

    const settings = parseTenantSettingsFormData(formData);

    expect(settings.hubTransfer).toEqual({
      enabledHubCategories: ['train', 'airport'],
    });
  });

  it('leaves hubTransfer undefined when hubTransferJson is absent', () => {
    const settings = parseTenantSettingsFormData(new FormData());
    expect(settings.hubTransfer).toBeUndefined();
  });
});
