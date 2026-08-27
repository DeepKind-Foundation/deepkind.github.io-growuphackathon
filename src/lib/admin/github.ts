import { Octokit } from "@octokit/core";
import { createAppAuth } from "@octokit/auth-app";

/** The single shared branch every admin save/delete commits to. Reset to `main`'s tip after every publish — never deleted, always reused. */
export const DEV_BRANCH = "dev";

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

/** The result of saving a change: the pending PR and how many files it now touches in total. */
export interface SaveResult {
  prNumber: number;
  prUrl: string;
  /** Total files changed across every pending edit on `dev`, not just this one — publishing is a global action. */
  pendingChangeCount: number;
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

export function toBase64(bytes: ArrayBuffer): string {
  let binary = "";
  const view = new Uint8Array(bytes);
  for (let i = 0; i < view.length; i += 1) {
    binary += String.fromCharCode(view[i]);
  }
  return btoa(binary);
}

/**
 * Decodes a base64 string to UTF-8 text. `atob` alone only understands
 * Latin-1 — decoding multi-byte UTF-8 content (e.g. Polish diacritics)
 * with it directly mangles every non-ASCII character, since each UTF-8
 * byte gets treated as its own Latin-1 code point instead of being
 * recombined. Re-interpreting the decoded bytes through TextDecoder
 * fixes that.
 */
export function fromBase64(base64: string): string {
  const binary = atob(base64);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder("utf-8").decode(bytes);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Lists every `*.json` entry in a collection directory on a given ref (defaults to the shared `dev` branch, so editors always see pending state). */
export async function listJsonEntries<T>(
  octokit: Octokit,
  repo: RepoRef,
  dirPath: string,
  ref: string = DEV_BRANCH,
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
      const raw = fromBase64(fileData.content.replace(/\n/g, ""));
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

/**
 * True only for errors that actually indicate a branch-level sha/ref
 * conflict worth retrying — a 409 always does; a 422 is GitHub's generic
 * "unprocessable" status covering many unrelated failure modes (bad
 * base64, path collisions, oversized payloads), so it's only treated as
 * a conflict when the message itself mentions the sha not matching.
 * Blindly retrying every 422 would silently retry — and waste latency
 * on — real caller bugs that can never succeed on retry.
 */
function isShaConflict(error: unknown): boolean {
  const status = (error as { status?: number })?.status;
  if (status === 409) return true;
  if (status !== 422) return false;
  const message = (error as { message?: string })?.message ?? "";
  return /sha/i.test(message);
}

/**
 * Runs `attempt` up to `attempts` times, refetching the current file sha
 * before each try, retrying with linear backoff on a sha/ref conflict.
 * `dev` is now a single branch shared by every editor, so two
 * near-simultaneous saves to *different* entries can occasionally race
 * on GitHub's branch-level locking even though they never touch the
 * same file.
 */
async function withShaConflictRetry(
  octokit: Octokit,
  repo: RepoRef,
  path: string,
  branch: string,
  attempt: (sha: string | undefined) => Promise<void>,
  attempts = 3,
): Promise<void> {
  for (let i = 0; i < attempts; i += 1) {
    const sha = await getFileSha(octokit, repo, path, branch);
    try {
      await attempt(sha);
      return;
    } catch (error) {
      if (!isShaConflict(error) || i === attempts - 1) throw error;
      await sleep(250 * (i + 1));
    }
  }
}

/** PUTs a file's content, retrying on a transient sha/ref conflict — see `withShaConflictRetry`. */
async function putContentWithRetry(
  octokit: Octokit,
  repo: RepoRef,
  opts: { path: string; message: string; bytes: ArrayBuffer; branch: string },
): Promise<void> {
  await withShaConflictRetry(octokit, repo, opts.path, opts.branch, (sha) =>
    octokit
      .request("PUT /repos/{owner}/{repo}/contents/{path}", {
        owner: repo.owner,
        repo: repo.repo,
        path: opts.path,
        message: opts.message,
        content: toBase64(opts.bytes),
        branch: opts.branch,
        sha,
      })
      .then(() => undefined),
  );
}

/** Same retry treatment as `putContentWithRetry`, for deletes. A missing file (already gone) is treated as success, not an error. */
async function deleteContentWithRetry(
  octokit: Octokit,
  repo: RepoRef,
  opts: { path: string; message: string; branch: string },
): Promise<void> {
  await withShaConflictRetry(octokit, repo, opts.path, opts.branch, (sha) => {
    if (!sha) return Promise.resolve(); // already gone
    return octokit
      .request("DELETE /repos/{owner}/{repo}/contents/{path}", {
        owner: repo.owner,
        repo: repo.repo,
        path: opts.path,
        message: opts.message,
        sha,
        branch: opts.branch,
      })
      .then(() => undefined);
  });
}

/** Fetches a single collection entry by slug, or `undefined` if it doesn't exist on the given ref (defaults to `dev`). */
export async function getJsonEntry<T>(
  octokit: Octokit,
  repo: RepoRef,
  dirPath: string,
  slug: string,
  ref: string = DEV_BRANCH,
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
    const raw = fromBase64(data.content.replace(/\n/g, ""));
    return { slug, path, data: JSON.parse(raw) as T };
  } catch {
    return undefined;
  }
}

/**
 * Ensures the shared `dev` branch exists, forked from `main`'s current
 * tip (a 422 on create means it already exists, which is the normal case
 * after the first-ever call). Also checks — concurrently, since neither
 * depends on the other — whether a `dev`→`main` PR is already open.
 */
async function ensureDevBranch(
  octokit: Octokit,
  repo: RepoRef,
): Promise<{ existingPr: Awaited<ReturnType<typeof findOpenPullRequest>> }> {
  const { owner, repo: name } = repo;

  const [mainRef, existingPr] = await Promise.all([
    octokit.request("GET /repos/{owner}/{repo}/git/ref/{ref}", {
      owner,
      repo: name,
      ref: "heads/main",
    }),
    findOpenPullRequest(octokit, repo, DEV_BRANCH),
  ]);

  await octokit
    .request("POST /repos/{owner}/{repo}/git/refs", {
      owner,
      repo: name,
      ref: `refs/heads/${DEV_BRANCH}`,
      sha: mainRef.data.object.sha,
    })
    .catch((error) => {
      if (error?.status !== 422) throw error;
    });

  return { existingPr };
}

const DEV_PR_TITLE = "Pending admin content changes (dev → main)";
const DEV_PR_BODY =
  "Opened automatically by the /admin app. Every save/delete from partner logo and people editing lands here — merging this publishes everything currently pending at once.";

/**
 * Opens the `dev`→`main` PR if none is open yet, or returns the existing
 * one. Unlike the old per-entry model, the PR's title/body is fixed and
 * set only once at creation — it accumulates changes from every editor,
 * so it must not carry any single entry's title.
 */
async function finalizePr(
  octokit: Octokit,
  repo: RepoRef,
  existingPr: Awaited<ReturnType<typeof findOpenPullRequest>>,
): Promise<SaveResult> {
  if (existingPr) {
    return {
      prNumber: existingPr.number,
      prUrl: existingPr.html_url,
      pendingChangeCount: await getChangedFileCount(
        octokit,
        repo,
        existingPr.number,
      ),
    };
  }

  const { data: pr } = await octokit.request(
    "POST /repos/{owner}/{repo}/pulls",
    {
      owner: repo.owner,
      repo: repo.repo,
      title: DEV_PR_TITLE,
      body: DEV_PR_BODY,
      head: DEV_BRANCH,
      base: "main",
    },
  );

  return {
    prNumber: pr.number,
    prUrl: pr.html_url,
    pendingChangeCount: pr.changed_files ?? 1,
  };
}

/**
 * Commits a JSON entry — and optionally an image file alongside it — to
 * the shared `dev` branch, opening the `dev`→`main` PR if this is the
 * first pending change. Never commits directly to `main`. `commitMessage`
 * is per-entry (used only for the git commit, not the PR itself).
 */
export async function saveEntry(
  octokit: Octokit,
  repo: RepoRef,
  opts: {
    jsonPath: string;
    jsonContent: unknown;
    image?: { path: string; bytes: ArrayBuffer };
    commitMessage: string;
  },
): Promise<SaveResult> {
  const { existingPr } = await ensureDevBranch(octokit, repo);

  const jsonBody = `${JSON.stringify(opts.jsonContent, null, 2)}\n`;

  // Two writes to the same branch race on the branch ref if issued
  // concurrently — these stay sequential (each internally retries on its
  // own transient conflicts, see putContentWithRetry).
  await putContentWithRetry(octokit, repo, {
    path: opts.jsonPath,
    message: opts.commitMessage,
    bytes: new TextEncoder().encode(jsonBody).buffer as ArrayBuffer,
    branch: DEV_BRANCH,
  });

  if (opts.image) {
    await putContentWithRetry(octokit, repo, {
      path: opts.image.path,
      message: `${opts.commitMessage} (image)`,
      bytes: opts.image.bytes,
      branch: DEV_BRANCH,
    });
  }

  return finalizePr(octokit, repo, existingPr);
}

/**
 * Deletes a JSON entry — and its image file, if any — from the shared
 * `dev` branch. Mirrors `saveEntry`'s mechanics; never deletes from
 * `main` directly.
 */
export async function deleteEntry(
  octokit: Octokit,
  repo: RepoRef,
  opts: {
    jsonPath: string;
    imagePath?: string;
    commitMessage: string;
  },
): Promise<SaveResult> {
  const { existingPr } = await ensureDevBranch(octokit, repo);

  await deleteContentWithRetry(octokit, repo, {
    path: opts.jsonPath,
    message: opts.commitMessage,
    branch: DEV_BRANCH,
  });

  if (opts.imagePath) {
    await deleteContentWithRetry(octokit, repo, {
      path: opts.imagePath,
      message: `${opts.commitMessage} (image)`,
      branch: DEV_BRANCH,
    });
  }

  return finalizePr(octokit, repo, existingPr);
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

/**
 * The `GET /pulls` list endpoint (used by findOpenPullRequest) doesn't
 * include `changed_files` — only the single-PR endpoint does. A small
 * follow-up call for the cases that actually need the count.
 */
export async function getChangedFileCount(
  octokit: Octokit,
  repo: RepoRef,
  pullNumber: number,
): Promise<number> {
  const { data } = await octokit.request(
    "GET /repos/{owner}/{repo}/pulls/{pull_number}",
    { owner: repo.owner, repo: repo.repo, pull_number: pullNumber },
  );
  return data.changed_files ?? 0;
}

/** The result of a publish: whether a concurrent save landed in the merge/reset window and got discarded by the `dev` reset. */
export interface PublishResult {
  discardedConcurrentSave: boolean;
}

/**
 * Squash-merges the `dev`→`main` PR — publishing every currently pending
 * change at once — then resets `dev` back to `main`'s new tip. The reset
 * is mandatory, not cleanup: a squash merge produces a new commit object
 * that `dev`'s own history doesn't contain, so without it the next save
 * would build on stale history and silently no-op against the real
 * `main` on its next publish (the exact bug this design replaces).
 * Force-updates the ref (one atomic call, no window where `dev` doesn't
 * exist) rather than deleting and recreating it.
 */
export async function publishDev(
  octokit: Octokit,
  repo: RepoRef,
): Promise<PublishResult> {
  const pr = await findOpenPullRequest(octokit, repo, DEV_BRANCH);
  if (!pr) {
    throw new Error(`No open PR from "${DEV_BRANCH}" to publish.`);
  }

  await octokit.request("PUT /repos/{owner}/{repo}/pulls/{pull_number}/merge", {
    owner: repo.owner,
    repo: repo.repo,
    pull_number: pr.number,
    merge_method: "squash",
  });

  // Independent reads — fetched concurrently.
  const [{ data: mainRef }, { data: devRefBeforeReset }] = await Promise.all([
    octokit.request("GET /repos/{owner}/{repo}/git/ref/{ref}", {
      owner: repo.owner,
      repo: repo.repo,
      ref: "heads/main",
    }),
    octokit.request("GET /repos/{owner}/{repo}/git/ref/{ref}", {
      owner: repo.owner,
      repo: repo.repo,
      ref: `heads/${DEV_BRANCH}`,
    }),
  ]);

  // Safety net: if dev's tip no longer matches what we just merged, a
  // save landed in the merge/reset window and is about to be discarded
  // by the force-reset below. Nothing to roll back (the merge already
  // happened) — surface it to the caller instead of only logging, since
  // the editor would otherwise see their save silently vanish with no
  // explanation.
  const discardedConcurrentSave = devRefBeforeReset.object.sha !== pr.head.sha;

  await octokit.request("PATCH /repos/{owner}/{repo}/git/refs/{ref}", {
    owner: repo.owner,
    repo: repo.repo,
    ref: `heads/${DEV_BRANCH}`,
    sha: mainRef.object.sha,
    force: true,
  });

  return { discardedConcurrentSave };
}
