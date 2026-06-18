import { defineConfig } from 'steiger';
import fsd from '@feature-sliced/steiger-plugin';

export default defineConfig([
  ...fsd.configs.recommended,
  {
    rules: {
      // FSD pages layer lives in src/views (Next.js reserves src/pages)
      'fsd/insignificant-slice': 'off',
    },
  },
  {
    files: ['./src/app/**'],
    rules: {
      'fsd/no-ui-in-app': 'off',
      'fsd/public-api': 'off',
    },
  },
]);
