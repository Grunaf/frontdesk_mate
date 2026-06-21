import { AirVent, Bed, Lock, ShowerHead, Wifi } from 'lucide-react';

import { Icon } from '@/shared/ui';

interface AmenityIconProps {
  name: 'wifi' | 'ac' | 'lock' | 'bed' | 'shower';
  size?: number;
}

const AMENITY_ICONS = {
  wifi: { icon: Wifi, className: 'text-primary' },
  ac: { icon: AirVent, className: 'text-primary' },
  lock: { icon: Lock, className: 'text-destructive' },
  bed: { icon: Bed, className: 'text-foreground' },
  shower: { icon: ShowerHead, className: 'text-primary' },
} as const;

export function AmenityIcon({ name, size = 16 }: AmenityIconProps) {
  const config = AMENITY_ICONS[name];
  if (!config) return null;

  return <Icon icon={config.icon} size={size} className={config.className} />;
}
