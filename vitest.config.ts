import { defineConfig } from "vitest/config";

// Unit tests live beside source in src/. The e2e/ directory is Playwright's
// domain (run via `pnpm test:e2e`) and must not be collected by Vitest.
export default defineConfig({
  test: {
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    exclude: ["e2e/**", "node_modules/**", "dist/**"],
  },
});
