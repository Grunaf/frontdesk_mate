import { describe, expect, it } from 'vitest';

import { validateTourismWhatsapp } from './validateTourismWhatsapp';

describe('validateTourismWhatsapp', () => {
  it('requires non-empty input', () => {
    expect(validateTourismWhatsapp('')).toEqual({ ok: false, error: 'whatsapp_required' });
    expect(validateTourismWhatsapp('   ')).toEqual({ ok: false, error: 'whatsapp_required' });
  });

  it('rejects too few or too many digits', () => {
    expect(validateTourismWhatsapp('1234567')).toEqual({ ok: false, error: 'invalid_whatsapp' });
    expect(validateTourismWhatsapp('1'.repeat(16))).toEqual({ ok: false, error: 'invalid_whatsapp' });
  });

  it('normalizes to E.164 from formatted input', () => {
    expect(validateTourismWhatsapp('+382 67 123 456')).toEqual({
      ok: true,
      e164: '+38267123456',
    });
    expect(validateTourismWhatsapp('38267123456')).toEqual({
      ok: true,
      e164: '+38267123456',
    });
  });
});
