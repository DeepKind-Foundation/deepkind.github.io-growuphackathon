import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import keystatic from '@keystatic/astro';
import node from '@astrojs/node';

// Static public site; the Keystatic admin route renders on demand via the Node adapter.
export default defineConfig({
  site: 'https://growuphackathon.pl',
  output: 'static',
  adapter: node({ mode: 'standalone' }),
  integrations: [react(), keystatic()],
});
