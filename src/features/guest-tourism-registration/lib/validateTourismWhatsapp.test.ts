import { describe, expect, it } from 'vitest';

import { validateTourismWhatsapp } from './validateTourismWhatsapp';

describe('validateTourismWhatsapp', () => {
  it('requires non-empty input', () => {
    expect(validateTourismWhatsapp('')).toEqual({ ok: false, error: 'whatsapp_required' });
    expect(validateTourismWhatsapp('   ')).toEqual({ ok: false, error: 'whatsapp_required' });
  });

  it('rejects too few digits or non-numbers', () => {
    expect(validateTourismWhatsapp('1234567')).toEqual({ ok: false, error: 'invalid_whatsapp' });
    expect(validateTourismWhatsapp('+++')).toEqual({ ok: false, error: 'invalid_whatsapp' });
  });

  it('rejects invalid country numbers even when digit length looks plausible', () => {
    expect(validateTourismWhatsapp('+111111111')).toEqual({ ok: false, error: 'invalid_whatsapp' });
  });

  it('normalizes ME numbers to E.164 from formatted input', () => {
    expect(validateTourismWhatsapp('+382 67 123 456')).toEqual({
      ok: true,
      e164: '+38267123456',
    });
    expect(validateTourismWhatsapp('38267123456')).toEqual({
      ok: true,
      e164: '+38267123456',
    });
  });

  it('accepts international mobiles (DE / UK / US / TR)', () => {
    expect(validateTourismWhatsapp('+49 170 1234567')).toEqual({
      ok: true,
      e164: '+491701234567',
    });
    expect(validateTourismWhatsapp('+44 7911 123456')).toEqual({
      ok: true,
      e164: '+447911123456',
    });
    expect(validateTourismWhatsapp('+1 202 555 0123')).toEqual({
      ok: true,
      e164: '+12025550123',
    });
    expect(validateTourismWhatsapp('+90 555 123 4567')).toEqual({
      ok: true,
      e164: '+905551234567',
    });
  });
});
