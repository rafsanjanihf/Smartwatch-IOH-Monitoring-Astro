import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import react from '@astrojs/react';

// import sentry from '@sentry/astro';
// import spotlightjs from '@spotlightjs/astro';

import cloudflare from '@astrojs/cloudflare';

export default defineConfig({
  // integrations: [tailwind(), react(), sentry(), spotlightjs()],
  integrations: [tailwind(), react()], // Disabled sentry() and spotlightjs() to reduce error spam
  adapter: cloudflare(),
  vite: {
    build: {
      assetsInlineLimit: 0, // Prevent inlining assets to allow better caching
    },
    server: {
      headers: {
        'Cache-Control': 'public, max-age=31536000', // Cache static assets for 1 year
      }
    }
  }
});