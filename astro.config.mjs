import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import react from '@astrojs/react';

import sentry from '@sentry/astro';
import spotlightjs from '@spotlightjs/astro';

import cloudflare from '@astrojs/cloudflare';

export default defineConfig({
  integrations: [tailwind(), react(), sentry(), spotlightjs()],
  adapter: cloudflare(),
});