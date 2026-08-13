import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

/** A mentor row from the CSV, with the derived public image path. */
export interface Mentor {
  index: number;
  name: string;
  role: string;
  bio: string;
  linkedin: string;
  image: string;
}

const DATA_DIR = path.join(process.cwd(), "src/data");
const MENTORS_CSV = path.join(DATA_DIR, "mentors.csv");
const MENTORS_DUMMY_CSV = path.join(DATA_DIR, "mentors.dummy.csv");

/** Splits CSV text into rows of cells, honouring double-quoted fields (with "" escaping). */
function parseCsv(raw: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;

  for (let i = 0; i < raw.length; i += 1) {
    const char = raw[i];

    if (inQuotes) {
      if (char === '"') {
        if (raw[i + 1] === '"') {
          cell += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        cell += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      row.push(cell);
      cell = "";
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && raw[i + 1] === "\n") i += 1;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += char;
    }
  }
  // Flush the final cell/row if the file doesn't end with a newline.
  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }

  return rows;
}

/**
 * Reads mentors from src/data/mentors.csv. In dev, falls back to the
 * committed mentors.dummy.csv when the real file isn't present yet. In
 * production builds, a missing or empty mentors.csv yields no mentors —
 * the section then renders nothing (see MentorsSection.astro) rather than
 * shipping placeholder data.
 *
 * Expected columns: name, role, bio, linkedin (linkedin is optional).
 * Each mentor's photo is expected at public/images/mentors/{index}.png,
 * where {index} is the mentor's zero-based position in the CSV (header
 * row excluded).
 */
export function getMentors(): Mentor[] {
  const hasRealCsv = existsSync(MENTORS_CSV);
  if (!hasRealCsv && !import.meta.env.DEV) return [];

  const csvPath = hasRealCsv ? MENTORS_CSV : MENTORS_DUMMY_CSV;
  const raw = readFileSync(csvPath, "utf-8");
  const rows = parseCsv(raw).filter((row) =>
    row.some((cell) => cell.trim() !== ""),
  );
  if (rows.length === 0) return [];

  const [header, ...dataRows] = rows;
  const columns = header.map((col) => col.trim().toLowerCase());

  return dataRows.map((row, index) => {
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
      image: `/images/mentors/${index}.png`,
    };
  });
}
