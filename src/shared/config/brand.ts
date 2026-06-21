export type IconLibrary = 'hugeicons' | 'lucide';

export interface BrandConfig {
  colors: {
    primary: string;
    foreground: string;
  };
  radius: string;
  iconLibrary: IconLibrary;
}

/** Platform defaults; per-tenant brand overrides can be added via tenant.settings.brand. */
export const BRAND_CONFIG: BrandConfig = {
  colors: {
    primary: '#FF6B00',
    foreground: '#1A1A1A',
  },
  radius: '0.625rem',
  iconLibrary: 'hugeicons',
};
