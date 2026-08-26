import { describe, expect, it } from "vitest";
import { parseCsv, stripBlankRows } from "./csv";

describe("parseCsv", () => {
  it("splits simple comma-separated rows", () => {
    expect(parseCsv("a,b,c\n1,2,3\n")).toEqual([
      ["a", "b", "c"],
      ["1", "2", "3"],
    ]);
  });

  it("keeps commas inside quoted fields intact", () => {
    expect(
      parseCsv('name,bio\nAnna,"Rozwija produkty, prowadzi zespoły"\n'),
    ).toEqual([
      ["name", "bio"],
      ["Anna", "Rozwija produkty, prowadzi zespoły"],
    ]);
  });

  it("unescapes doubled quotes inside quoted fields", () => {
    expect(parseCsv('quote\n"She said ""hi"""\n')).toEqual([
      ["quote"],
      ['She said "hi"'],
    ]);
  });

  it("handles CRLF line endings without leaving stray carriage returns", () => {
    expect(parseCsv("a,b\r\n1,2\r\n")).toEqual([
      ["a", "b"],
      ["1", "2"],
    ]);
  });

  it("flushes the final row when the file has no trailing newline", () => {
    expect(parseCsv("a,b\n1,2")).toEqual([
      ["a", "b"],
      ["1", "2"],
    ]);
  });

  it("returns no rows for an empty string", () => {
    expect(parseCsv("")).toEqual([]);
  });

  it("preserves blank lines as empty-cell rows", () => {
    expect(parseCsv("a\n\nb\n")).toEqual([["a"], [""], ["b"]]);
  });
});

describe("stripBlankRows", () => {
  it("drops rows where every cell is blank or whitespace-only", () => {
    expect(
      stripBlankRows([
        ["a", "b"],
        ["", ""],
        ["  ", ""],
        ["1", "2"],
      ]),
    ).toEqual([
      ["a", "b"],
      ["1", "2"],
    ]);
  });

  it("keeps a row if at least one cell has content", () => {
    expect(stripBlankRows([["", "x"]])).toEqual([["", "x"]]);
  });
});
