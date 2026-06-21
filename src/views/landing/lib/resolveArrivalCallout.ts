export type LandingArrivalCalloutKind = 'arrival' | 'explore';

export function resolveArrivalCallout(checkIn: string, now = new Date()): LandingArrivalCalloutKind | null {
  const trimmed = checkIn.trim();
  if (!trimmed) {
    return null;
  }

  const checkInDate = new Date(`${trimmed}T12:00:00`);
  if (Number.isNaN(checkInDate.getTime())) {
    return null;
  }

  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(checkInDate.getFullYear(), checkInDate.getMonth(), checkInDate.getDate());
  const daysUntilCheckIn = Math.round((target.getTime() - today.getTime()) / 86_400_000);

  if (daysUntilCheckIn < 0) {
    return null;
  }

  return daysUntilCheckIn <= 2 ? 'arrival' : 'explore';
}
