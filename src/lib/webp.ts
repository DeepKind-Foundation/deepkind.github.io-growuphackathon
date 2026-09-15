import { existsSync } from "node:fs";
import { stat } from "node:fs/promises";
import sharp from "sharp";

const DEFAULT_MAX_SOURCE_BYTES = 8 * 1024 * 1024;
// Guards sharp against decompression-bomb-style inputs (tiny file, huge pixel count).
const MAX_INPUT_PIXELS = 40_000_000;

export interface EnsureWebpFileOptions {
  /** Source files larger than this are skipped rather than converted. */
  maxSourceBytes?: number;
}

/** True for raster formats sharp can re-encode to WebP. SVG and already-modern formats are left as-is. */
export function isWebpConvertible(publicPath: string): boolean {
  return /\.(png|jpe?g)$/i.test(publicPath);
}

/** Derives the `.webp` sibling path for a convertible source path. */
export function webpSiblingPath(publicPath: string): string {
  return publicPath.replace(/\.(png|jpe?g)$/i, ".webp");
}

/**
 * Converts the image at `srcAbsPath` to a `.webp` file at `destAbsPath`, unless one
 * already exists there. Never throws: a missing/oversized/corrupt source is logged
 * and skipped. Returns whether `destAbsPath` is present and usable afterwards —
 * callers should fall back to the original source format when this is false.
 */
export async function ensureWebpFile(
  srcAbsPath: string,
  destAbsPath: string,
  options: EnsureWebpFileOptions = {},
): Promise<boolean> {
  if (existsSync(destAbsPath)) return true;

  const maxSourceBytes = options.maxSourceBytes ?? DEFAULT_MAX_SOURCE_BYTES;

  try {
    const { size } = await stat(srcAbsPath);
    if (size > maxSourceBytes) {
      console.warn(
        `Skipping WebP conversion (source exceeds ${maxSourceBytes} bytes): ${srcAbsPath}`,
      );
      return false;
    }

    await sharp(srcAbsPath, { limitInputPixels: MAX_INPUT_PIXELS })
      .webp({ quality: 82 })
      .toFile(destAbsPath);
    return true;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn(`Skipping WebP conversion (${message}): ${srcAbsPath}`);
    return false;
  }
}
