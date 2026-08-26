import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { parseCsv, stripBlankRows } from "./csv";

/** A person row from a group's CSV, with the derived public image path. */
export interface Person {
  index: number;
  name: string;
  role: string;
  bio: string;
  linkedin: string;
  image: string;
}

// English, gender-neutral group slugs — used for CSV filenames and image
// folders only. The Polish, gender-neutral display copy for each group
// lives in PeopleSection.astro (e.g. "będą się opiekowały zespołami").
/** The three CSV-driven people groups shown under the "Mentoring" section. */
export type PeopleGroup = "mentors" | "experts" | "trainers";

const DATA_DIR = path.join(process.cwd(), "src/data");

/**
 * Maps parsed CSV rows (header + data rows) to Person records for the given
 * group. Expected columns: name, role, bio, linkedin (linkedin is optional).
 * Each person's photo is expected at public/images/{group}/{index}.png,
 * where {index} is the person's zero-based position in the CSV (header
 * row excluded).
 */
export function mapRowsToPeople(
  rows: string[][],
  group: PeopleGroup,
): Person[] {
  const dataRows = stripBlankRows(rows);
  if (dataRows.length === 0) return [];

  const [header, ...records] = dataRows;
  const columns = header.map((col) => col.trim().toLowerCase());

  return records.map((row, index) => {
    const record: Record<string, string> = {};
    columns.forEach((col, i) => {
      record[col] = (row[i] ?? "").trim();
    });

    return {
      index,
      name: record.name ?? "",
      role: record.role ?? "",
      bio: record.bio ?? "",
      linkedin: record.linkedin ?? "",
      image: `/images/${group}/${index}.png`,
    };
  });
}

/**
 * Reads a people group from src/data/{group}.csv. In dev, falls back to the
 * committed src/data/{group}.dummy.csv when the real file isn't present yet.
 * In production builds, a missing or empty {group}.csv yields no people —
 * the caller should then render nothing rather than shipping placeholder
 * data.
 */
export function getPeople(group: PeopleGroup): Person[] {
  const realPath = path.join(DATA_DIR, `${group}.csv`);
  const dummyPath = path.join(DATA_DIR, `${group}.dummy.csv`);

  const hasRealCsv = existsSync(realPath);
  if (!hasRealCsv && !import.meta.env.DEV) return [];

  const csvPath = hasRealCsv ? realPath : dummyPath;
  const raw = readFileSync(csvPath, "utf-8");
  return mapRowsToPeople(parseCsv(raw), group);
}
