import { describe, expect, it } from "vitest";
import { fromBase64, toBase64 } from "./github";

describe("toBase64 / fromBase64 round trip", () => {
  it("preserves Polish diacritics through UTF-8 bytes", () => {
    const text = "Łukasz Wąsik — mentorka ds. rozwoju, zażółć gęślą jaźń";
    const bytes = new TextEncoder().encode(text).buffer as ArrayBuffer;
    expect(fromBase64(toBase64(bytes))).toBe(text);
  });

  it("matches what atob alone would mangle, proving the bug this guards against", () => {
    const text = "ąćęłńóśźż";
    const bytes = new TextEncoder().encode(text).buffer as ArrayBuffer;
    const base64 = toBase64(bytes);
    expect(atob(base64)).not.toBe(text);
    expect(fromBase64(base64)).toBe(text);
  });
});
