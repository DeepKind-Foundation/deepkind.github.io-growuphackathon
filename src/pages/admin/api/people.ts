import type { APIRoute } from "astro";
import {
  createInstallationOctokit,
  saveEntry,
} from "../../../lib/admin/github";
import {
  getGitHubAppCredentials,
  getEditorEmail,
  getPreviewUrl,
  REPO,
} from "../../../lib/admin/env";
import { slugify } from "../../../lib/admin/slug";
import { jsonResponse } from "../../../lib/admin/http";
import { PEOPLE_IMAGES_DIR, type PersonData } from "../../../lib/admin/types";

export const prerender = false;

const MAX_IMAGE_BYTES = 2 * 1024 * 1024;
const GROUPS = ["mentors", "experts", "trainers"];

/**
 * Creates or updates one mentor/expert/trainer entry. Always writes to a
 * branch + PR against `main` — never commits directly. Called from the
 * /admin people forms; the editor never touches GitHub directly.
 */
export const POST: APIRoute = async ({ request }) => {
  const form = await request.formData();

  const existingSlug = form.get("slug");
  const isEdit = typeof existingSlug === "string" && existingSlug.length > 0;

  const name = String(form.get("name") ?? "").trim();
  const group = String(form.get("group") ?? "");
  const orderRaw = form.get("order");
  const order = orderRaw ? Number(orderRaw) : 0;
  const role = String(form.get("role") ?? "").trim();
  const bio = String(form.get("bio") ?? "").trim();
  const linkedin = String(form.get("linkedin") ?? "").trim();
  const photoFile = form.get("photo");
  const existingPhoto = form.get("existingPhoto");

  if (!name) return jsonResponse({ error: "Name is required." }, 400);
  if (!GROUPS.includes(group))
    return jsonResponse({ error: "Invalid group." }, 400);

  const slug = isEdit ? (existingSlug as string) : slugify(name);
  if (!slug)
    return jsonResponse(
      { error: "Could not derive a slug from that name." },
      400,
    );

  let image: { path: string; bytes: ArrayBuffer } | undefined;
  let photoFilename: string | undefined;

  if (photoFile instanceof File && photoFile.size > 0) {
    if (photoFile.size > MAX_IMAGE_BYTES) {
      return jsonResponse({ error: "Photo must be under 2MB." }, 400);
    }
    const ext = photoFile.name.split(".").pop()?.toLowerCase() ?? "png";
    photoFilename = `${slug}.${ext}`;
    image = {
      path: `${PEOPLE_IMAGES_DIR}/${photoFilename}`,
      bytes: await photoFile.arrayBuffer(),
    };
  }

  const jsonContent: PersonData = {
    name,
    group,
    order,
    role,
    bio,
    linkedin,
    photo:
      photoFilename ?? (typeof existingPhoto === "string" ? existingPhoto : ""),
  };

  const branch = `admin-person-${slug}`;
  const editorEmail = getEditorEmail(request);

  try {
    const octokit = createInstallationOctokit(getGitHubAppCredentials());
    const result = await saveEntry(octokit, REPO, {
      branch,
      jsonPath: `src/content/people/${slug}.json`,
      jsonContent,
      image,
      prTitle: `Person: ${name}`,
      prBody: `Submitted by ${editorEmail} via /admin.`,
    });
    return jsonResponse(
      { ...result, previewUrl: getPreviewUrl(result.branch) },
      200,
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown error saving person.";
    return jsonResponse({ error: message }, 500);
  }
};
