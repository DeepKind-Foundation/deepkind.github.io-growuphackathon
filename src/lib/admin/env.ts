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
 * Preview URL for a branch, once the marketing-site "dev" Cloudflare Pages
 * project exists (set DEV_PAGES_PROJECT to enable). Returns `null` until
 * then — a guessed URL that might 404 is worse than admitting there's no
 * preview yet; callers should fall back to pointing the editor at the PR.
 * Once DEV_PAGES_PROJECT is set, replace this branch-alias guess with a
 * real lookup via Cloudflare's API
 * (GET /accounts/{account_id}/pages/projects/{project}/deployments), since
 * branch-name sanitization isn't fully guaranteed to match this pattern.
 */
export function getPreviewUrl(branch: string): string | null {
  const devProject = getEnvVar("DEV_PAGES_PROJECT");
  if (!devProject) return null;

  const alias = branch
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .slice(0, 28)
    .replace(/^-+|-+$/g, "");
  return `https://${alias}.${devProject}.pages.dev`;
}
