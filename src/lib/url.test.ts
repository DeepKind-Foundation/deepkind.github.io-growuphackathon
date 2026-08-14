import { describe, it, expect } from "vitest";
import { safeHref } from "./url";

describe("safeHref", () => {
  it('returns "#" for null, undefined, and empty input', () => {
    expect(safeHref(null)).toBe("#");
    expect(safeHref(undefined)).toBe("#");
    expect(safeHref("")).toBe("#");
    expect(safeHref("   ")).toBe("#");
  });

  it("passes in-page anchors through unchanged", () => {
    expect(safeHref("#faq")).toBe("#faq");
    expect(safeHref("#o-projekcie")).toBe("#o-projekcie");
  });

  it("passes root-relative paths through unchanged", () => {
    expect(safeHref("/regulamin")).toBe("/regulamin");
    expect(safeHref("/logos/logo_growup.png")).toBe("/logos/logo_growup.png");
  });

  it("allows absolute URLs on safe protocols", () => {
    expect(safeHref("https://forms.gle/NTtcg68N7odoFQqS8")).toBe(
      "https://forms.gle/NTtcg68N7odoFQqS8",
    );
    expect(safeHref("http://example.com")).toBe("http://example.com");
    expect(safeHref("mailto:kontakt@growuphackathon.pl")).toBe(
      "mailto:kontakt@growuphackathon.pl",
    );
    expect(safeHref("tel:+48123456789")).toBe("tel:+48123456789");
  });

  it('collapses script-bearing protocols to "#"', () => {
    expect(safeHref("javascript:alert(1)")).toBe("#");
    expect(safeHref("data:text/html,<script>alert(1)</script>")).toBe("#");
    expect(safeHref("vbscript:msgbox(1)")).toBe("#");
  });

  it('collapses malformed URLs to "#"', () => {
    expect(safeHref("http://")).toBe("#");
    expect(safeHref("not a url")).toBe("#");
  });

  it("trims surrounding whitespace before deciding", () => {
    expect(safeHref("  #faq  ")).toBe("#faq");
    expect(safeHref("  https://example.com  ")).toBe("https://example.com");
  });
});
