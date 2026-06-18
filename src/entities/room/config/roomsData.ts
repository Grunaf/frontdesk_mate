export interface BedTypeData {
  id: string;
  cloudbedsId: string;
  translationKey: string;
  basePriceEur: number;
  imageSrc: string;
  requiresChatUpgrade: boolean;
}
export const ROOMS_DATA: BedTypeData[] = [
  {
    id: 'single-bed-dorm',
    cloudbedsId: 'DORM8',
    translationKey: 'singleBedDorm',
    basePriceEur: 15,
    imageSrc: '/images/rooms/single-dorm.jpg',
    requiresChatUpgrade: true,
  },
  {
    id: 'private-room',
    cloudbedsId: 'DBL_PRIV',
    translationKey: 'privateRoom',
    basePriceEur: 45,
    imageSrc: '/images/rooms/double-private.jpg',
    requiresChatUpgrade: false,
  },
] as const;
