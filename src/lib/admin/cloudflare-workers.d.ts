// Minimal ambient declaration for the Workers built-in module used by
// src/lib/admin/env.ts. `astro check` type-checks the whole project
// against astro.config.mjs (the Node-adapter config), which has no
// knowledge of Workers-only modules — this keeps that pass green without
// pulling in the full @cloudflare/workers-types package (which would
// conflict with this project's DOM lib types elsewhere).
declare module "cloudflare:workers" {
  export const env: Record<string, string | undefined>;
}
