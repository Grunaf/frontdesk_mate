import type { ComponentType, SVGProps } from 'react';
import { HugeiconsIcon, type IconSvgElement } from '@hugeicons/react';

import { BRAND_CONFIG } from '@/shared/config/brand';
import { cn } from '@/shared/lib/utils';

type LucideIcon = ComponentType<SVGProps<SVGSVGElement> & { size?: number | string }>;

interface IconProps {
  icon: IconSvgElement | LucideIcon;
  className?: string;
  size?: number;
}

function isHugeicon(icon: IconSvgElement | LucideIcon): icon is IconSvgElement {
  return Array.isArray(icon);
}

export function Icon({ icon, className, size = 16 }: IconProps) {
  if (BRAND_CONFIG.iconLibrary === 'hugeicons' && isHugeicon(icon)) {
    return <HugeiconsIcon icon={icon} size={size} className={cn('shrink-0', className)} />;
  }

  const LucideComponent = icon as LucideIcon;
  return <LucideComponent size={size} className={cn('shrink-0', className)} />;
}
