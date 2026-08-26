import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import keystatic from '@keystatic/astro';
import node from '@astrojs/node';
import icon from 'astro-icon';

// Static public site; the Keystatic admin route renders on demand via the Node adapter.
export default defineConfig({
  site: 'https://growuphackathon.pl',
  output: 'static',
  adapter: node({ mode: 'standalone' }),
  integrations: [icon(), react(), keystatic()],
  vite: {
    optimizeDeps: {
      // react-dom/client is CJS; force pre-bundling so Vite exposes named ESM exports
      // (e.g. createRoot) that Keystatic's island hydration relies on.
      include: ['react-dom/client'],
    },
    build: {
      rollupOptions: {
        // src/pages/admin/** (built by astro.config.cloudflare.mjs, deployed
        // separately to Cloudflare) is still discovered by this config since
        // it shares the same src/pages tree. Its routes are all
        // `prerender = false`, so they're never invoked by the GitHub Pages
        // static output — but Rollup still needs to resolve their imports at
        // bundle time. cloudflare:workers only exists in the Workers
        // runtime; externalize it here rather than resolve it.
        external: ['cloudflare:workers'],
      },
    },
  },
});
