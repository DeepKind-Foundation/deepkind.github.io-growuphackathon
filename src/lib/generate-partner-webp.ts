import { readdir } from "node:fs/promises";
import path from "node:path";
import { ensureWebpFile, isWebpConvertible, webpSiblingPath } from "./webp";

const PARTNER_LOGOS_DIR = path.join(
  process.cwd(),
  "public",
  "images",
  "partners",
);

/**
 * Generates WebP siblings for every partner logo in public/images/partners.
 * Safe to call repeatedly — already-converted files are left untouched.
 */
export async function generatePartnerWebp(): Promise<void> {
  let files: string[];
  try {
    files = await readdir(PARTNER_LOGOS_DIR);
  } catch {
    console.log(
      `No partner logos directory at ${PARTNER_LOGOS_DIR}, skipping.`,
    );
    return;
  }

  const convertible = files.filter(isWebpConvertible);
  const results = await Promise.all(
    convertible.map(async (file) => {
      const src = path.join(PARTNER_LOGOS_DIR, file);
      const dest = path.join(PARTNER_LOGOS_DIR, webpSiblingPath(file));
      return { file, ok: await ensureWebpFile(src, dest) };
    }),
  );

  const failed = results.filter((r) => !r.ok);
  console.log(
    `Partner logo WebP: ${results.length - failed.length}/${results.length} ready` +
      (failed.length ? ` (${failed.length} skipped, see warnings above)` : ""),
  );
}
