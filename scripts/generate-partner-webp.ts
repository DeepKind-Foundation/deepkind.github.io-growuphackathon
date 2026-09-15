/** Manual/CI entry point for src/lib/generate-partner-webp.ts — see astro-plugin-partner-webp.ts for the automatic (dev/build) trigger. */
import { generatePartnerWebp } from "../src/lib/generate-partner-webp.ts";

await generatePartnerWebp();
