export type IconLibrary = 'hugeicons' | 'lucide';

export const BRAND_CONFIG = {
  colors: {
    primary: process.env.NEXT_PUBLIC_COLOR_PRIMARY || '#FF6B00',
    foreground: process.env.NEXT_PUBLIC_COLOR_DARK || '#1A1A1A',
  },
  radius: process.env.NEXT_PUBLIC_BRAND_RADIUS || '0.625rem',
  iconLibrary: (process.env.NEXT_PUBLIC_ICON_LIBRARY || 'hugeicons') as IconLibrary,
} as const;

export type BrandConfig = typeof BRAND_CONFIG;
