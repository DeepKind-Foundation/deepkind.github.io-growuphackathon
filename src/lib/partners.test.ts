import { describe, expect, it } from "vitest";
import { mapRowsToPartnerLogos } from "./partners";

const HEADER = ["name", "file"];

describe("mapRowsToPartnerLogos", () => {
  it("maps header + data rows into PartnerLogo records with a zero-based index", () => {
    const rows = [
      HEADER,
      ["ABB", "abb.svg"],
      ["Fundacja PFR", "fundacja-pfr.svg"],
    ];

    expect(mapRowsToPartnerLogos(rows, "program")).toEqual([
      {
        index: 0,
        name: "ABB",
        file: "abb.svg",
        image: "/images/partners/program/abb.svg",
      },
      {
        index: 1,
        name: "Fundacja PFR",
        file: "fundacja-pfr.svg",
        image: "/images/partners/program/fundacja-pfr.svg",
      },
    ]);
  });

  it("derives the image path from the given category folder", () => {
    const rows = [HEADER, ["Trawell", "trawell.svg"]];
    expect(mapRowsToPartnerLogos(rows, "community")[0].image).toBe(
      "/images/partners/community/trawell.svg",
    );
  });

  it("matches columns case-insensitively and trims whitespace", () => {
    const rows = [
      [" Name ", "FILE"],
      [" ABB ", " abb.svg "],
    ];
    expect(mapRowsToPartnerLogos(rows, "program")[0]).toEqual({
      index: 0,
      name: "ABB",
      file: "abb.svg",
      image: "/images/partners/program/abb.svg",
    });
  });

  it("returns an empty array when there is only a header row", () => {
    expect(mapRowsToPartnerLogos([HEADER], "program")).toEqual([]);
  });

  it("returns an empty array for no rows at all", () => {
    expect(mapRowsToPartnerLogos([], "program")).toEqual([]);
  });

  it("drops fully blank rows before assigning indices", () => {
    const rows = [HEADER, ["", ""], ["ABB", "abb.svg"]];
    const logos = mapRowsToPartnerLogos(rows, "program");
    expect(logos).toHaveLength(1);
    expect(logos[0]).toMatchObject({
      index: 0,
      name: "ABB",
      image: "/images/partners/program/abb.svg",
    });
  });

  it("leaves image empty when the file column is missing", () => {
    const rows = [["name"], ["ABB"]];
    expect(mapRowsToPartnerLogos(rows, "program")[0]).toEqual({
      index: 0,
      name: "ABB",
      file: "",
      image: "",
    });
  });
});
