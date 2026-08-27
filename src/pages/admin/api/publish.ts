import type { APIRoute } from "astro";
import {
  createInstallationOctokit,
  publishDev,
} from "../../../lib/admin/github";
import { getGitHubAppCredentials, REPO } from "../../../lib/admin/env";
import { jsonResponse } from "../../../lib/admin/http";

export const prerender = false;

/**
 * Self-publish: squash-merges the shared `dev` branch's PR into `main`,
 * publishing every currently pending change at once — then resets `dev`
 * to `main`'s new tip. Triggers the existing GitHub Pages deploy
 * workflow. A global action, not scoped to any one entry.
 */
export const POST: APIRoute = async () => {
  try {
    const octokit = createInstallationOctokit(getGitHubAppCredentials());
    const { discardedConcurrentSave } = await publishDev(octokit, REPO);
    return jsonResponse({ published: true, discardedConcurrentSave }, 200);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown error publishing.";
    return jsonResponse({ error: message }, 500);
  }
};
