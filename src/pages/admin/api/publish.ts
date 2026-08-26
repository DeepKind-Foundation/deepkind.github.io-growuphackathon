import type { APIRoute } from "astro";
import {
  createInstallationOctokit,
  publishBranch,
} from "../../../lib/admin/github";
import { getGitHubAppCredentials, REPO } from "../../../lib/admin/env";
import { jsonResponse } from "../../../lib/admin/http";

export const prerender = false;

/**
 * Self-publish: squash-merges the PR for a branch into `main`, which
 * triggers the existing GitHub Pages deploy workflow. Shown to the editor
 * only after they've opened the branch's preview link.
 */
export const POST: APIRoute = async ({ request }) => {
  const body = await request.json().catch(() => null);
  const branch =
    body && typeof (body as { branch?: unknown }).branch === "string"
      ? (body as { branch: string }).branch
      : undefined;

  if (!branch) {
    return jsonResponse({ error: "Missing branch." }, 400);
  }

  try {
    const octokit = createInstallationOctokit(getGitHubAppCredentials());
    await publishBranch(octokit, REPO, branch);
    return jsonResponse({ published: true }, 200);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown error publishing.";
    return jsonResponse({ error: message }, 500);
  }
};
