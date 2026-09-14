import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import sharp from "sharp";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ensureWebpFile, isWebpConvertible, webpSiblingPath } from "./webp";

describe("isWebpConvertible", () => {
  it("is true for png, jpg and jpeg (case-insensitive)", () => {
    expect(isWebpConvertible("/images/partners/abb.png")).toBe(true);
    expect(isWebpConvertible("/images/partners/abb.jpg")).toBe(true);
    expect(isWebpConvertible("/images/partners/abb.jpeg")).toBe(true);
    expect(isWebpConvertible("/images/partners/abb.PNG")).toBe(true);
  });

  it("is false for formats that are already modern or can't be re-encoded", () => {
    expect(isWebpConvertible("/images/partners/abb.svg")).toBe(false);
    expect(isWebpConvertible("/images/partners/abb.webp")).toBe(false);
    expect(isWebpConvertible("/images/partners/abb.gif")).toBe(false);
    expect(isWebpConvertible("/images/partners/abb")).toBe(false);
  });
});

describe("webpSiblingPath", () => {
  it("swaps the extension to .webp, keeping the directory and basename", () => {
    expect(webpSiblingPath("/images/partners/abb.png")).toBe(
      "/images/partners/abb.webp",
    );
    expect(webpSiblingPath("/images/partners/sub/x.JPEG")).toBe(
      "/images/partners/sub/x.webp",
    );
  });
});

describe("ensureWebpFile", () => {
  let dir: string;

  beforeEach(async () => {
    dir = await mkdtemp(path.join(tmpdir(), "webp-test-"));
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  async function writeTestPng(filePath: string): Promise<void> {
    const buffer = await sharp({
      create: {
        width: 4,
        height: 4,
        channels: 3,
        background: { r: 10, g: 20, b: 30 },
      },
    })
      .png()
      .toBuffer();
    await writeFile(filePath, buffer);
  }

  it("converts a valid source image and returns true", async () => {
    const src = path.join(dir, "logo.png");
    const dest = path.join(dir, "logo.webp");
    await writeTestPng(src);

    const result = await ensureWebpFile(src, dest);

    expect(result).toBe(true);
    const output = await readFile(dest);
    expect(output.subarray(0, 4).toString("ascii")).toBe("RIFF");
    expect(output.subarray(8, 12).toString("ascii")).toBe("WEBP");
  });

  it("skips reconversion and returns true when the destination already exists", async () => {
    const src = path.join(dir, "logo.png");
    const dest = path.join(dir, "logo.webp");
    await writeTestPng(src);
    await writeFile(dest, "sentinel");

    const result = await ensureWebpFile(src, dest);

    expect(result).toBe(true);
    expect((await readFile(dest, "utf-8")).toString()).toBe("sentinel");
  });

  it("skips conversion and returns false when the source exceeds maxSourceBytes", async () => {
    const src = path.join(dir, "logo.png");
    const dest = path.join(dir, "logo.webp");
    await writeTestPng(src);

    const result = await ensureWebpFile(src, dest, { maxSourceBytes: 1 });

    expect(result).toBe(false);
    await expect(readFile(dest)).rejects.toThrow();
  });

  it("returns false without throwing when the source is not a valid image", async () => {
    const src = path.join(dir, "logo.png");
    const dest = path.join(dir, "logo.webp");
    await writeFile(src, "not actually a png");

    await expect(ensureWebpFile(src, dest)).resolves.toBe(false);
  });

  it("returns false without throwing when the source file is missing", async () => {
    const src = path.join(dir, "missing.png");
    const dest = path.join(dir, "logo.webp");

    await expect(ensureWebpFile(src, dest)).resolves.toBe(false);
  });
});
