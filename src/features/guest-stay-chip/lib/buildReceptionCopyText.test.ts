import { describe, expect, it } from 'vitest';
import { buildReceptionCopyText } from './buildReceptionCopyText';

const compose = (key: string, values?: Record<string, string>) => {
  switch (key) {
    case 'copyLineHostel':
      return values?.hostelName ?? '';
    case 'copyLineBed':
      return `Bed: ${values?.bedLine ?? ''}`;
    case 'copyLineDates':
      return `Stay: ${values?.dateRange ?? ''}`;
    case 'copyLineRef':
      return `Ref: #${values?.stayRef ?? ''}`;
    case 'copyLineName':
      return `Name: ${values?.guestName ?? ''}`;
    default:
      return key;
  }
};

describe('buildReceptionCopyText', () => {
  it('includes hostel, bed, dates, and ref', () => {
    const text = buildReceptionCopyText({
      hostelName: 'Vega',
      bedLine: 'Bed 12 · Room 4',
      dateRange: '22 Jun – 25 Jun',
      stayRef: 'A3F2B1',
      guestName: null,
      compose,
    });

    expect(text).toContain('Vega');
    expect(text).toContain('Bed: Bed 12 · Room 4');
    expect(text).toContain('Stay: 22 Jun – 25 Jun');
    expect(text).toContain('Ref: #A3F2B1');
    expect(text).not.toContain('Name:');
  });

  it('appends guest name when provided', () => {
    const text = buildReceptionCopyText({
      hostelName: 'Vega',
      bedLine: 'Bed 12',
      dateRange: '22 Jun – 25 Jun',
      stayRef: 'A3F2B1',
      guestName: 'Alex',
      compose,
    });

    expect(text).toContain('Name: Alex');
  });
});
