import { describe, expect, it } from 'vitest';
import { resolveRecommendedTaxi } from './resolveRecommendedTaxi';

describe('resolveRecommendedTaxi', () => {
  const tenantTaxi = { raw: '', mask: '', formatPreset: undefined, href: '' };

  it('enables WhatsApp by default when pack flag is omitted', () => {
    const resolved = resolveRecommendedTaxi(
      { name: 'Red Taxi', phoneRaw: '38267019719' },
      tenantTaxi
    );
    expect(resolved?.whatsappEnabled).toBe(true);
  });

  it('disables WhatsApp when pack sets whatsappEnabled false', () => {
    const resolved = resolveRecommendedTaxi(
      { name: 'Desk Taxi', phoneRaw: '38220123456', whatsappEnabled: false },
      tenantTaxi
    );
    expect(resolved?.whatsappEnabled).toBe(false);
  });
});
