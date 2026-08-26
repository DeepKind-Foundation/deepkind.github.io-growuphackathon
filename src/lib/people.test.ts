import { describe, expect, it } from "vitest";
import { mapRowsToPeople } from "./people";

const HEADER = ["name", "role", "bio", "linkedin"];

describe("mapRowsToPeople", () => {
  it("maps header + data rows into Person records with a zero-based index", () => {
    const rows = [
      HEADER,
      ["Anna Nowak", "Mentorka", "Opis", "https://linkedin.com/in/anna"],
      ["Jan Kowalski", "Mentor", "Opis", ""],
    ];

    expect(mapRowsToPeople(rows, "mentors")).toEqual([
      {
        index: 0,
        name: "Anna Nowak",
        role: "Mentorka",
        bio: "Opis",
        linkedin: "https://linkedin.com/in/anna",
        image: "/images/mentors/0.png",
      },
      {
        index: 1,
        name: "Jan Kowalski",
        role: "Mentor",
        bio: "Opis",
        linkedin: "",
        image: "/images/mentors/1.png",
      },
    ]);
  });

  it("derives the image path from the given group folder", () => {
    const rows = [HEADER, ["Ewa Test", "Ekspertka", "Opis", ""]];
    expect(mapRowsToPeople(rows, "experts")[0].image).toBe(
      "/images/experts/0.png",
    );
  });

  it("matches columns case-insensitively and trims whitespace", () => {
    const rows = [
      [" Name ", "ROLE", "Bio", "LinkedIn"],
      [" Jan ", " Trener ", " Opis ", " "],
    ];
    expect(mapRowsToPeople(rows, "trainers")[0]).toEqual({
      index: 0,
      name: "Jan",
      role: "Trener",
      bio: "Opis",
      linkedin: "",
      image: "/images/trainers/0.png",
    });
  });

  it("returns an empty array when there is only a header row", () => {
    expect(mapRowsToPeople([HEADER], "mentors")).toEqual([]);
  });

  it("returns an empty array for no rows at all", () => {
    expect(mapRowsToPeople([], "mentors")).toEqual([]);
  });

  it("drops fully blank rows before assigning indices", () => {
    const rows = [
      HEADER,
      ["", "", "", ""],
      ["Anna Nowak", "Mentorka", "Opis", ""],
    ];
    const people = mapRowsToPeople(rows, "mentors");
    expect(people).toHaveLength(1);
    expect(people[0]).toMatchObject({
      index: 0,
      name: "Anna Nowak",
      image: "/images/mentors/0.png",
    });
  });

  it("defaults missing optional columns to empty strings", () => {
    const rows = [["name"], ["Anna Nowak"]];
    expect(mapRowsToPeople(rows, "mentors")[0]).toEqual({
      index: 0,
      name: "Anna Nowak",
      role: "",
      bio: "",
      linkedin: "",
      image: "/images/mentors/0.png",
    });
  });
});
