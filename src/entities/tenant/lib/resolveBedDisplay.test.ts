import { describe, expect, it } from 'vitest';
import {
  dedupeGuestStayBedIds,
  normalizeGuestStayForSave,
  normalizeGuestStayLabels,
  normalizeStayLabel,
  remapHighlightedBedIdAfterDedupe,
  resolveBedDisplayLabel,
  resolveBedMapDisplayLabel,
  resolveBedPickerOptions,
  resolveBedSlotNumber,
} from './resolveBedDisplay';
import type { GuestStayConfig } from '../model/guestStay';

const guestStay: GuestStayConfig = {
  floors: [{ id: '1', label: '1' }],
  rooms: [{ id: 'vega', label: 'Vega', floorId: '1' }],
  beds: [
    {
      id: 'vega_bed_1',
      roomId: 'vega',
      bedType: 'bunk',
      topId: 'vega_bed_1-Top',
      bottomId: 'vega_bed_1-Bot',
    },
    { id: 'vega_bed_2', roomId: 'vega', bedType: 'single' },
  ],
};

describe('resolveBedSlotNumber', () => {
  it('returns 1-based index within room', () => {
    expect(resolveBedSlotNumber(guestStay.beds!, guestStay.beds![0], 'vega')).toBe(1);
    expect(resolveBedSlotNumber(guestStay.beds!, guestStay.beds![1], 'vega')).toBe(2);
  });
});

describe('resolveBedPickerOptions', () => {
  it('includes room and floor context with bunk tiers', () => {
    const options = resolveBedPickerOptions(guestStay);

    expect(options).toHaveLength(3);
    expect(options[0]?.value).toBe('vega_bed_1-Top');
    expect(options[0]?.label).toBe('Vega · Bed 1 · Upper · Floor 1');
    expect(options[0]?.key).toBe('vega:top:vega_bed_1-Top');
    expect(options[2]?.value).toBe('vega_bed_2');
    expect(options[2]?.key).toBe('vega:vega_bed_2');
  });
});

describe('resolveBedDisplayLabel', () => {
  it('returns slot number for single bed', () => {
    expect(
      resolveBedDisplayLabel({ guestStay, highlightedBedId: 'vega_bed_2' }, 'vega_bed_2')
    ).toBe('2');
  });

  it('returns slot and tier for bunk', () => {
    expect(
      resolveBedDisplayLabel({ guestStay, highlightedBedId: 'vega_bed_1-Top' }, 'vega_bed_1-Top')
    ).toBe('1 · Upper');
  });

  it('falls back to raw id for legacy data', () => {
    expect(resolveBedDisplayLabel({}, '4B')).toBe('4B');
  });
});

describe('dedupeGuestStayBedIds', () => {
  it('renames duplicate legacy ids per room', () => {
    const before = {
      rooms: [
        { id: 'room_1', label: 'A', floorId: '1' },
        { id: 'room_2', label: 'B', floorId: '1' },
      ],
      beds: [
        { id: 'bed_2', roomId: 'room_1' },
        { id: 'bed_2', roomId: 'room_2' },
        { id: 'bed_3', roomId: 'room_2' },
      ],
    };

    const after = dedupeGuestStayBedIds(before);

    expect(after.beds?.[0]?.id).toBe('bed_2');
    expect(after.beds?.[1]?.id).toBe('room_2_bed_1');
    expect(after.beds?.[2]?.id).toBe('bed_3');
    expect(new Set(after.beds?.map((bed) => bed.id)).size).toBe(3);
  });

  it('remaps highlighted bed when its id was deduped', () => {
    const before = {
      beds: [
        { id: 'bed_2', roomId: 'room_1' },
        { id: 'bed_2', roomId: 'room_2' },
      ],
    };
    const after = dedupeGuestStayBedIds(before);

    expect(remapHighlightedBedIdAfterDedupe('bed_2', before, after)).toBe('bed_2');
    expect(after.beds?.[1]?.id).toBe('room_2_bed_1');
  });
});

describe('normalizeStayLabel', () => {
  it('strips Floor/Room prefixes from stored labels', () => {
    expect(normalizeStayLabel('floor', 'Floor 2')).toBe('2');
    expect(normalizeStayLabel('room', 'Room Vega')).toBe('Vega');
    expect(normalizeStayLabel('floor', '2')).toBe('2');
  });
});

describe('normalizeGuestStayLabels', () => {
  it('strips prefixes from floors and rooms', () => {
    const normalized = normalizeGuestStayLabels({
      floors: [{ id: '1', label: 'Floor 1' }],
      rooms: [{ id: 'r1', label: 'Room Vega', floorId: '1' }],
    });

    expect(normalized.floors?.[0]?.label).toBe('1');
    expect(normalized.rooms?.[0]?.label).toBe('Vega');
  });
});

describe('normalizeGuestStayForSave', () => {
  it('combines label normalization, dedupe, and highlighted bed remap', () => {
    const guestStayInput = {
      floors: [{ id: '1', label: 'Floor 1' }],
      rooms: [
        { id: 'room_1', label: 'Room A', floorId: '1' },
        { id: 'room_2', label: 'Room B', floorId: '1' },
      ],
      beds: [
        { id: 'bed_2', roomId: 'room_1' },
        { id: 'bed_2', roomId: 'room_2' },
      ],
    };

    const result = normalizeGuestStayForSave(guestStayInput, 'bed_2');

    expect(result.guestStay.floors?.[0]?.label).toBe('1');
    expect(result.guestStay.rooms?.[0]?.label).toBe('A');
    expect(result.guestStay.beds?.[1]?.id).toBe('room_2_bed_1');
    expect(result.highlightedBedId).toBe('bed_2');
  });
});

describe('resolveBedMapDisplayLabel', () => {
  it('returns numeric slot labels for map', () => {
    expect(resolveBedMapDisplayLabel(guestStay, guestStay.beds![1])).toBe('2');
    expect(resolveBedMapDisplayLabel(guestStay, guestStay.beds![0], 'top')).toBe('1↑');
    expect(resolveBedMapDisplayLabel(guestStay, guestStay.beds![0], 'bottom')).toBe('1');
  });
});
