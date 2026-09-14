import type { AstroIntegration } from "astro";
import { generatePartnerWebp } from "./generate-partner-webp";

/**
 * Generates partner logo WebP files before Astro serves (dev) or builds
 * (build) — needed because `astro build` copies `public/` into the output
 * directory before page frontmatter would otherwise trigger generation on
 * demand, which is too late for that copy to pick the files up.
 */
export function partnerWebp(): AstroIntegration {
  return {
    name: "partner-webp",
    hooks: {
      "astro:server:start": () => generatePartnerWebp(),
      "astro:build:start": () => generatePartnerWebp(),
    },
  };
}
