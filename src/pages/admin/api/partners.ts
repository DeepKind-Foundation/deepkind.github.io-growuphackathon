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
import { PARTNER_IMAGES_DIR, type PartnerData } from "../../../lib/admin/types";

export const prerender = false;

const MAX_IMAGE_BYTES = 2 * 1024 * 1024;
const CATEGORIES = ["program", "community", "patron"];

/**
 * Creates or updates one partner logo entry. Always writes to a branch +
 * PR against `main` — never commits directly. Called from the /admin
 * partner forms; the editor never touches GitHub directly.
 */
export const POST: APIRoute = async ({ request }) => {
  const form = await request.formData();

  const existingSlug = form.get("slug");
  const isEdit = typeof existingSlug === "string" && existingSlug.length > 0;

  const name = String(form.get("name") ?? "").trim();
  const category = String(form.get("category") ?? "");
  const orderRaw = form.get("order");
  const order = orderRaw ? Number(orderRaw) : 0;
  const logoFile = form.get("logo");
  const existingLogo = form.get("existingLogo");

  if (!name) return jsonResponse({ error: "Partner name is required." }, 400);
  if (!CATEGORIES.includes(category))
    return jsonResponse({ error: "Invalid category." }, 400);

  const slug = isEdit ? (existingSlug as string) : slugify(name);
  if (!slug)
    return jsonResponse(
      { error: "Could not derive a slug from that name." },
      400,
    );

  let image: { path: string; bytes: ArrayBuffer } | undefined;
  let logoFilename: string | undefined;

  if (logoFile instanceof File && logoFile.size > 0) {
    if (logoFile.size > MAX_IMAGE_BYTES) {
      return jsonResponse({ error: "Logo must be under 2MB." }, 400);
    }
    const ext = logoFile.name.split(".").pop()?.toLowerCase() ?? "png";
    logoFilename = `${slug}.${ext}`;
    image = {
      path: `${PARTNER_IMAGES_DIR}/${logoFilename}`,
      bytes: await logoFile.arrayBuffer(),
    };
  }

  if (!logoFilename && !isEdit) {
    return jsonResponse(
      { error: "A logo image is required for a new partner." },
      400,
    );
  }

  const jsonContent: PartnerData = {
    name,
    category,
    order,
    logo:
      logoFilename ?? (typeof existingLogo === "string" ? existingLogo : ""),
  };

  const branch = `admin-partner-${slug}`;
  const editorEmail = getEditorEmail(request);

  try {
    const octokit = createInstallationOctokit(getGitHubAppCredentials());
    const result = await saveEntry(octokit, REPO, {
      branch,
      jsonPath: `src/content/partners/${slug}.json`,
      jsonContent,
      image,
      prTitle: `Partner logo: ${name}`,
      prBody: `Submitted by ${editorEmail} via /admin.`,
    });
    return jsonResponse(
      { ...result, previewUrl: getPreviewUrl(result.branch) },
      200,
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown error saving partner.";
    return jsonResponse({ error: message }, 500);
  }
};
