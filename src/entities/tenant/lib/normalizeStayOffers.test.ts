import { describe, expect, it } from 'vitest';
import {
  finalizeStayOffersForSave,
  listStayOffers,
  listStayOffersForAdmin,
  migrateLegacyLandingRoomTypes,
  normalizeStayOffersOnRead,
} from './normalizeStayOffers';
import { resolveLandingRooms } from './resolveLandingRooms';
import type { TenantSettings } from '../model/settings';

describe('normalizeStayOffers', () => {
  it('migrates legacy landing.roomTypes into stayOffers + roomCards', () => {
    const settings: TenantSettings = {
      landing: {
        roomTypes: [
          {
            id: 'female',
            engineRoomTypeId: 'FEM8',
            title: 'Bed in female dorm',
            description: 'Shared',
            priceFromEur: 18,
            imageUrl: '/img/female.jpg',
          },
        ],
      },
    };

    const migrated = migrateLegacyLandingRoomTypes(settings);
    expect(migrated.didMigrate).toBe(true);
    expect(migrated.stayOffers).toEqual([
      {
        id: 'female',
        title: 'Bed in female dorm',
        engineRoomTypeId: 'FEM8',
        sortOrder: 0,
      },
    ]);
    expect(migrated.roomCards[0]).toMatchObject({
      offerId: 'female',
      title: 'Bed in female dorm',
      imageUrl: '/img/female.jpg',
      priceFromEur: 18,
    });
  });

  it('does not re-migrate when stayOffers already exist', () => {
    const settings: TenantSettings = {
      stayOffers: [{ id: 'private', title: 'Private room' }],
      landing: {
        roomCards: [{ offerId: 'private', imageUrl: '/p.jpg' }],
        roomTypes: [
          {
            id: 'legacy',
            engineRoomTypeId: 'X',
            title: 'Legacy',
            description: '',
            imageUrl: '/l.jpg',
          },
        ],
      },
    };

    const migrated = migrateLegacyLandingRoomTypes(settings);
    expect(migrated.didMigrate).toBe(false);
    expect(migrated.stayOffers.map((o) => o.id)).toEqual(['private']);
  });

  it('finalizeStayOffersForSave drops legacy roomTypes and dangling cards', () => {
    const settings: TenantSettings = {
      stayOffers: [
        { id: 'a', title: 'A', engineRoomTypeId: 'A1' },
        { id: 'b', title: 'B' },
      ],
      landing: {
        roomTypes: [
          {
            id: 'a',
            engineRoomTypeId: 'A1',
            title: 'A',
            description: '',
            imageUrl: '/a.jpg',
          },
        ],
        roomCards: [
          { offerId: 'a', imageUrl: '/a.jpg', description: 'Nice' },
          { offerId: 'missing', imageUrl: '/x.jpg' },
        ],
      },
    };

    const saved = finalizeStayOffersForSave(settings);
    expect(saved.landing?.roomTypes).toBeUndefined();
    expect(saved.stayOffers?.map((o) => o.id)).toEqual(['a', 'b']);
    expect(saved.landing?.roomCards).toEqual([
      { offerId: 'a', imageUrl: '/a.jpg', description: 'Nice' },
    ]);
  });

  it('resolveLandingRooms merges offer + card overrides', () => {
    const settings: TenantSettings = {
      booking: { provider: 'none' },
      stayOffers: [{ id: 'female', title: 'Female dorm', engineRoomTypeId: 'FEM' }],
      landing: {
        roomsSectionTitle: 'Rooms',
        roomCards: [
          {
            offerId: 'female',
            title: 'Bed in female dorm',
            description: 'Quiet floor',
            imageUrl: '/f.jpg',
            priceFromEur: 20,
          },
        ],
      },
    };

    const resolved = resolveLandingRooms(settings);
    expect(resolved.sectionTitle).toBe('Rooms');
    expect(resolved.roomTypes).toHaveLength(1);
    expect(resolved.roomTypes[0]).toMatchObject({
      id: 'female',
      title: 'Bed in female dorm',
      description: 'Quiet floor',
      engineRoomTypeId: 'FEM',
      imageUrl: '/f.jpg',
      priceFromEur: 20,
    });
  });

  it('synthesizes stayOffers when only roomCards exist', () => {
    const settings: TenantSettings = {
      landing: {
        roomCards: [{ offerId: 'female', title: 'Female bed', imageUrl: '/f.jpg' }],
        roomTypes: [
          {
            id: 'female',
            engineRoomTypeId: 'FEM',
            title: 'Legacy title',
            description: '',
            imageUrl: '/f.jpg',
          },
        ],
      },
    };

    const migrated = migrateLegacyLandingRoomTypes(settings);
    expect(migrated.didMigrate).toBe(true);
    expect(migrated.stayOffers[0]).toMatchObject({
      id: 'female',
      title: 'Female bed',
      engineRoomTypeId: 'FEM',
    });
  });

  it('listStayOffersForAdmin keeps empty-title draft offers', () => {
    const settings: TenantSettings = {
      stayOffers: [{ id: 'offer-1', title: '', sortOrder: 0 }],
    };
    expect(listStayOffers(settings)).toEqual([]);
    expect(listStayOffersForAdmin(settings)).toEqual([
      { id: 'offer-1', title: '', sortOrder: 0 },
    ]);
  });

  it('resolveLandingRooms still works from legacy roomTypes via on-read migrate', () => {
    const settings: TenantSettings = {
      booking: { provider: 'cloudbeds', engineId: 'ABC' },
      landing: {
        roomTypes: [
          {
            id: 'dorm',
            engineRoomTypeId: 'DORM8',
            title: 'Dorm bed',
            description: 'Shared room',
            priceFromEur: 15,
            imageUrl: '/images/rooms/single-dorm.jpg',
            requiresChatUpgrade: true,
          },
        ],
      },
    };

    expect(normalizeStayOffersOnRead(settings).stayOffers?.[0]?.id).toBe('dorm');
    expect(listStayOffers(settings)[0]?.title).toBe('Dorm bed');
    expect(resolveLandingRooms(settings).roomTypes).toHaveLength(1);
  });
});
