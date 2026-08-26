import { Octokit } from "@octokit/core";
import { createAppAuth } from "@octokit/auth-app";

/** GitHub App credentials, read from Worker env — never hardcoded. */
export interface GitHubAppCredentials {
  appId: string;
  privateKey: string;
  installationId: string;
}

export interface RepoRef {
  owner: string;
  repo: string;
}

/** A JSON content-collection entry read directly from GitHub (not the local filesystem). */
export interface RemoteEntry<T> {
  slug: string;
  path: string;
  data: T;
}

/** The result of saving a change: the branch it landed on and its PR number/URL. */
export interface SaveResult {
  branch: string;
  prNumber: number;
  prUrl: string;
  /** True if this save reused an already-open PR (e.g. someone else's pending edit for the same entry). */
  reusedExistingPr: boolean;
}

/** Creates an Octokit client authenticated as the GitHub App installation (short-lived token, not a stored PAT). */
export function createInstallationOctokit(
  creds: GitHubAppCredentials,
): Octokit {
  return new Octokit({
    authStrategy: createAppAuth,
    auth: {
      appId: creds.appId,
      privateKey: creds.privateKey,
      installationId: creds.installationId,
    },
  });
}

function toBase64(bytes: ArrayBuffer): string {
  let binary = "";
  const view = new Uint8Array(bytes);
  for (let i = 0; i < view.length; i += 1) {
    binary += String.fromCharCode(view[i]);
  }
  return btoa(binary);
}

/** Lists every `*.json` entry in a collection directory on a given ref (defaults to `main`). */
export async function listJsonEntries<T>(
  octokit: Octokit,
  repo: RepoRef,
  dirPath: string,
  ref = "main",
): Promise<RemoteEntry<T>[]> {
  const { data } = await octokit.request(
    "GET /repos/{owner}/{repo}/contents/{path}",
    {
      owner: repo.owner,
      repo: repo.repo,
      path: dirPath,
      ref,
    },
  );

  if (!Array.isArray(data)) return [];

  const jsonFiles = data.filter(
    (item) => item.type === "file" && item.name.endsWith(".json"),
  );

  const entries = await Promise.all(
    jsonFiles.map(async (file) => {
      const { data: fileData } = await octokit.request(
        "GET /repos/{owner}/{repo}/contents/{path}",
        {
          owner: repo.owner,
          repo: repo.repo,
          path: file.path,
          ref,
        },
      );
      if (
        Array.isArray(fileData) ||
        fileData.type !== "file" ||
        !fileData.content
      ) {
        throw new Error(`Expected a file at ${file.path}`);
      }
      const raw = atob(fileData.content.replace(/\n/g, ""));
      const slug = file.name.replace(/\.json$/, "");
      return { slug, path: file.path, data: JSON.parse(raw) as T };
    }),
  );

  return entries;
}

/** The blob SHA of a file on a given ref, or `undefined` if it doesn't exist — needed by the Contents API to update (vs. create) a file. */
async function getFileSha(
  octokit: Octokit,
  repo: RepoRef,
  path: string,
  ref: string,
): Promise<string | undefined> {
  return octokit
    .request("GET /repos/{owner}/{repo}/contents/{path}", {
      owner: repo.owner,
      repo: repo.repo,
      path,
      ref,
    })
    .then((res) => (Array.isArray(res.data) ? undefined : res.data.sha))
    .catch(() => undefined);
}

/** Fetches a single collection entry by slug, or `undefined` if it doesn't exist on the given ref. */
export async function getJsonEntry<T>(
  octokit: Octokit,
  repo: RepoRef,
  dirPath: string,
  slug: string,
  ref = "main",
): Promise<RemoteEntry<T> | undefined> {
  const path = `${dirPath}/${slug}.json`;
  try {
    const { data } = await octokit.request(
      "GET /repos/{owner}/{repo}/contents/{path}",
      { owner: repo.owner, repo: repo.repo, path, ref },
    );
    if (Array.isArray(data) || data.type !== "file" || !data.content) {
      return undefined;
    }
    const raw = atob(data.content.replace(/\n/g, ""));
    return { slug, path, data: JSON.parse(raw) as T };
  } catch {
    return undefined;
  }
}

/**
 * Creates (or reuses) a branch off `main`, commits a JSON entry — and
 * optionally an image file alongside it — then opens or updates a PR
 * against `main`. This is the entire "save" operation for one editor
 * action; it never commits directly to `main`.
 */
export async function saveEntry(
  octokit: Octokit,
  repo: RepoRef,
  opts: {
    branch: string;
    jsonPath: string;
    jsonContent: unknown;
    image?: { path: string; bytes: ArrayBuffer };
    prTitle: string;
    prBody: string;
  },
): Promise<SaveResult> {
  const { owner, repo: name } = repo;

  // Independent reads — neither depends on the other, so fetch concurrently.
  // Checking for an already-open PR up front (rather than only after
  // writing) lets the caller know this save is landing on top of someone
  // else's pending edit for the same entry, instead of silently reusing it.
  const [mainRef, existingPrBefore] = await Promise.all([
    octokit.request("GET /repos/{owner}/{repo}/git/ref/{ref}", {
      owner,
      repo: name,
      ref: "heads/main",
    }),
    findOpenPullRequest(octokit, repo, opts.branch),
  ]);
  const mainSha = mainRef.data.object.sha;

  // Create the branch; a 422 means it already exists, which is fine — no
  // separate existence probe needed.
  await octokit
    .request("POST /repos/{owner}/{repo}/git/refs", {
      owner,
      repo: name,
      ref: `refs/heads/${opts.branch}`,
      sha: mainSha,
    })
    .catch((error) => {
      if (error?.status !== 422) throw error;
    });

  const jsonBody = `${JSON.stringify(opts.jsonContent, null, 2)}\n`;
  const [existingJsonSha, existingImageSha] = await Promise.all([
    getFileSha(octokit, repo, opts.jsonPath, opts.branch),
    opts.image
      ? getFileSha(octokit, repo, opts.image.path, opts.branch)
      : undefined,
  ]);

  // Two writes to the same branch race on the branch ref if issued
  // concurrently — these stay sequential.
  await octokit.request("PUT /repos/{owner}/{repo}/contents/{path}", {
    owner,
    repo: name,
    path: opts.jsonPath,
    message: opts.prTitle,
    content: toBase64(new TextEncoder().encode(jsonBody).buffer as ArrayBuffer),
    branch: opts.branch,
    sha: existingJsonSha,
  });

  if (opts.image) {
    await octokit.request("PUT /repos/{owner}/{repo}/contents/{path}", {
      owner,
      repo: name,
      path: opts.image.path,
      message: `${opts.prTitle} (image)`,
      content: toBase64(opts.image.bytes),
      branch: opts.branch,
      sha: existingImageSha,
    });
  }

  if (existingPrBefore) {
    return {
      branch: opts.branch,
      prNumber: existingPrBefore.number,
      prUrl: existingPrBefore.html_url,
      reusedExistingPr: true,
    };
  }

  const { data: pr } = await octokit.request(
    "POST /repos/{owner}/{repo}/pulls",
    {
      owner,
      repo: name,
      title: opts.prTitle,
      body: opts.prBody,
      head: opts.branch,
      base: "main",
    },
  );

  return {
    branch: opts.branch,
    prNumber: pr.number,
    prUrl: pr.html_url,
    reusedExistingPr: false,
  };
}

/** Finds the open PR for a branch, if one exists. */
export async function findOpenPullRequest(
  octokit: Octokit,
  repo: RepoRef,
  branch: string,
) {
  const { data } = await octokit.request("GET /repos/{owner}/{repo}/pulls", {
    owner: repo.owner,
    repo: repo.repo,
    state: "open",
    head: `${repo.owner}:${branch}`,
  });
  return data[0];
}

/** Squash-merges the open PR for a branch into `main` — the self-publish action. */
export async function publishBranch(
  octokit: Octokit,
  repo: RepoRef,
  branch: string,
): Promise<void> {
  const pr = await findOpenPullRequest(octokit, repo, branch);
  if (!pr) {
    throw new Error(`No open PR found for branch "${branch}"`);
  }
  await octokit.request("PUT /repos/{owner}/{repo}/pulls/{pull_number}/merge", {
    owner: repo.owner,
    repo: repo.repo,
    pull_number: pr.number,
    merge_method: "squash",
  });
}
