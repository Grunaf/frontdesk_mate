'use client';

import { useEffect } from 'react';

import type { BrandConfig } from '@/shared/config/brand';
import { getBrandCssVars } from '@/shared/lib';

interface ThemeProviderProps {
  brand: BrandConfig;
  children: React.ReactNode;
}

export function ThemeProvider({ brand, children }: ThemeProviderProps) {
  useEffect(() => {
    const vars = getBrandCssVars(brand);

    for (const [key, value] of Object.entries(vars)) {
      if (value) {
        document.documentElement.style.setProperty(key, String(value));
      }
    }
  }, [brand]);

  return children;
}
