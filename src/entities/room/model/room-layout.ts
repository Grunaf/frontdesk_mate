export interface RoomLayoutBed {
  id: string;
  x: number;
  y: number;
  isBunk?: boolean;
  topId?: string;
  bottomId?: string;
}

export const ROOM_LAYOUT_BEDS: RoomLayoutBed[] = [
  { id: '4A', x: 30, y: 30, isBunk: true, topId: '4A-Top', bottomId: '4A-Bot' },
  { id: '4B', x: 30, y: 110, isBunk: false },
  { id: '4C', x: 170, y: 30, isBunk: true, topId: '4C-Top', bottomId: '4C-Bot' },
  { id: '4D', x: 170, y: 110, isBunk: false },
];
