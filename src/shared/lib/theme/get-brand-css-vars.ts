import type { CSSProperties } from 'react';

import type { BrandConfig } from '@/shared/config/brand';
import { BRAND_CONFIG } from '@/shared/config/brand';

export function getBrandCssVars(brand: BrandConfig = BRAND_CONFIG): CSSProperties {
  return {
    '--primary': brand.colors.primary,
    '--foreground': brand.colors.foreground,
    '--radius': brand.radius,
  } as CSSProperties;
}
