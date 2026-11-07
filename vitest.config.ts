/// <reference types="vitest/config" />
import { getViteConfig } from 'astro/config';

// getViteConfig lets tests import Astro components (Container API) and astro:* modules.
export default getViteConfig({
  test: {
    include: ['tests/unit/**/*.test.ts'],
    environment: 'node',
    coverage: {
      provider: 'v8',
      include: ['src/lib/**/*.ts'],
      reporter: ['text', 'html', 'lcov'],
      thresholds: {
        lines: 90,
      },
    },
  },
});
