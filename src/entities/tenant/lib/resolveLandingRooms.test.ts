import { describe, expect, it } from 'vitest';
import { hasLandingContent, hasLandingRooms, resolveLandingRooms } from './resolveLandingRooms';
import type { TenantSettings } from '../model/settings';

describe('resolveLandingRooms', () => {
  it('normalizes room types and drops incomplete entries', () => {
    const settings: TenantSettings = {
      landing: {
        roomsSectionTitle: 'Choose your stay',
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
          {
            id: 'incomplete',
            engineRoomTypeId: '',
            title: 'Missing',
            description: '',
            imageUrl: '',
          },
        ],
      },
    };

    const resolved = resolveLandingRooms(settings);

    expect(resolved.sectionTitle).toBe('Choose your stay');
    expect(resolved.roomTypes).toHaveLength(1);
    expect(resolved.roomTypes[0]?.engineRoomTypeId).toBe('DORM8');
  });

  it('detects landing content from hero or rooms', () => {
    expect(hasLandingRooms({ landing: { roomTypes: [] } })).toBe(false);
    expect(hasLandingContent({ heroBgUrl: 'images/room.jpg' })).toBe(true);
    expect(
      hasLandingContent({
        landing: {
          roomTypes: [
            {
              id: 'dorm',
              engineRoomTypeId: 'DORM8',
              title: 'Dorm',
              description: 'Shared',
              imageUrl: '/img.jpg',
            },
          ],
        },
      })
    ).toBe(true);
  });
});
