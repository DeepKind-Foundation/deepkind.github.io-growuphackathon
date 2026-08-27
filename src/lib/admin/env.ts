import { env } from "cloudflare:workers";
import type { GitHubAppCredentials, RepoRef } from "./github";

/** The repo this admin app is wired to write against. */
export const REPO: RepoRef = {
  owner: "DeepKind-Foundation",
  repo: "deepkind.github.io-growuphackathon",
};

function getEnvVar(name: string): string | undefined {
  return (env as Record<string, string | undefined>)[name];
}

/**
 * Reads the GitHub App credentials from the Worker environment. Set via
 * `wrangler secret put` in production, `.dev.vars` locally — never
 * committed. Throws with a clear message if setup is incomplete, rather
 * than failing deep inside an Octokit call.
 */
export function getGitHubAppCredentials(): GitHubAppCredentials {
  const appId = getEnvVar("KEYSTATIC_GITHUB_APP_ID");
  const privateKey = getEnvVar("KEYSTATIC_GITHUB_APP_PRIVATE_KEY");
  const installationId = getEnvVar("KEYSTATIC_GITHUB_APP_INSTALLATION_ID");

  if (!appId || !privateKey || !installationId) {
    throw new Error(
      "GitHub App credentials are not configured. Set KEYSTATIC_GITHUB_APP_ID, " +
        "KEYSTATIC_GITHUB_APP_PRIVATE_KEY, and KEYSTATIC_GITHUB_APP_INSTALLATION_ID.",
    );
  }

  return { appId, privateKey, installationId };
}

/** The editor's verified email, injected by Cloudflare Access on every request. */
export function getEditorEmail(request: Request): string {
  return (
    request.headers.get("Cf-Access-Authenticated-User-Email") ??
    "unknown editor"
  );
}

/**
 * The live preview URL for pending changes: the `dev` branch's Cloudflare
 * Pages production deployment. Set DEV_PREVIEW_URL once that project's
 * custom domain exists — a single shared branch means a single, static
 * URL, not something to guess per save. Returns `null` until then;
 * callers fall back to linking the PR instead of showing a URL that
 * might 404.
 */
export function getPreviewUrl(): string | null {
  return getEnvVar("DEV_PREVIEW_URL") ?? null;
}
