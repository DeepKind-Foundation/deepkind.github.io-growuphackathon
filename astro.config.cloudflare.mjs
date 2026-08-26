import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import cloudflare from '@astrojs/cloudflare';
import icon from 'astro-icon';

// Deploys the /admin routes to Cloudflare (server-rendered, so /admin can
// talk to GitHub's API on every request). The GitHub Pages build
// (astro.config.mjs) remains the source of truth for the marketing site;
// index.astro/regulamin.astro are also compiled here (Astro builds the
// whole src/pages tree), but explicitly prerendered — see their
// `prerender = true` exports — so Keystatic's local-storage reader runs
// with real filesystem access at build time, not inside the request-time
// Workers sandbox. prerenderEnvironment: 'node' makes that build step run
// under plain Node rather than a workerd sandbox, which has no access to
// the source tree's files.
export default defineConfig({
  site: 'https://growuphackathon.pl',
  output: 'server',
  adapter: cloudflare({ prerenderEnvironment: 'node' }),
  integrations: [icon(), react()],
  vite: {
    optimizeDeps: {
      include: ['react-dom/client'],
    },
  },
});
