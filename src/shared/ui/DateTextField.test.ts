import { describe, expect, it } from 'vitest';
import {
  appendDateDigit,
  digitsToDisplay,
  displayDateToIso,
  EMPTY_DATE_SEGMENTS,
  extractDateDigits,
  feedDateDigits,
  isoDateToDisplay,
  removeLastDateDigit,
  segmentsToDisplay,
} from './DateTextField';

describe('extractDateDigits', () => {
  it('keeps only digits up to 8', () => {
    expect(extractDateDigits('15.06.1990')).toBe('15061990');
    expect(extractDateDigits('abc15061990123')).toBe('15061990');
  });
});

describe('appendDateDigit / feedDateDigits', () => {
  it('fills day → month → year for 30122000', () => {
    expect(segmentsToDisplay(feedDateDigits('30122000'))).toBe('30.12.2000');
  });

  it('auto-pads day when first digit is 4–9', () => {
    expect(segmentsToDisplay(feedDateDigits('4'))).toBe('04');
    expect(segmentsToDisplay(feedDateDigits('4121990'))).toBe('04.12.1990');
  });

  it('rejects impossible day and month digits', () => {
    expect(appendDateDigit({ day: '3', month: '', year: '' }, '5')).toBeNull();
    expect(appendDateDigit({ day: '30', month: '1', year: '' }, '3')).toBeNull();
    expect(appendDateDigit(EMPTY_DATE_SEGMENTS, 'a')).toBeNull();
  });

  it('auto-pads month when first digit is 2–9', () => {
    expect(segmentsToDisplay(feedDateDigits('153'))).toBe('15.03');
  });

  it('removeLastDateDigit peels year then month then day', () => {
    let segments = feedDateDigits('30122000');
    segments = removeLastDateDigit(segments);
    expect(segmentsToDisplay(segments)).toBe('30.12.200');
    segments = removeLastDateDigit(segments);
    segments = removeLastDateDigit(segments);
    segments = removeLastDateDigit(segments);
    expect(segmentsToDisplay(segments)).toBe('30.12');
  });
});

describe('digitsToDisplay', () => {
  it('uses segment feeding', () => {
    expect(digitsToDisplay('30122000')).toBe('30.12.2000');
    expect(digitsToDisplay('15061990')).toBe('15.06.1990');
  });
});

describe('isoDateToDisplay', () => {
  it('formats ISO day as dd.MM.yyyy', () => {
    expect(isoDateToDisplay('1990-06-15')).toBe('15.06.1990');
  });

  it('returns empty for invalid ISO', () => {
    expect(isoDateToDisplay('')).toBe('');
    expect(isoDateToDisplay('15.06.1990')).toBe('');
  });
});

describe('displayDateToIso', () => {
  it('parses complete display date to ISO', () => {
    expect(displayDateToIso('15.06.1990')).toBe('1990-06-15');
    expect(displayDateToIso('30122000')).toBe('2000-12-30');
  });

  it('returns empty string for blank input', () => {
    expect(displayDateToIso('')).toBe('');
    expect(displayDateToIso('   ')).toBe('');
  });

  it('rejects incomplete, invalid or future dates', () => {
    expect(displayDateToIso('15.06.19')).toBeNull();
    expect(displayDateToIso('31.02.1990')).toBeNull();
    expect(displayDateToIso('15.06.1899')).toBeNull();
    expect(displayDateToIso('01.01.2999')).toBeNull();
    expect(displayDateToIso('not-a-date')).toBeNull();
  });
});
