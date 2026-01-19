// Room configuration
export const ROOMS = [
  'AB1 301', 'AB1 302', 'AB1 303', 'AB1 304', 'AB1 305',
  'AB1 306', 'AB1 307', 'AB1 308', 'AB1 309', 'AB1 310',
  'AB1 311', 'AB1 312', 'AB1 313', 'AB1 314', 'AB1 315'
] as const;

export const TOTAL_ROOMS = 15;

export type RoomNumber = typeof ROOMS[number];
