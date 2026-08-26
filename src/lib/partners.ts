import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { parseCsv, stripBlankRows } from "./csv";

/** A partner logo row from a category's CSV, with the derived public image path. */
export interface PartnerLogo {
  index: number;
  name: string;
  file: string;
  image: string;
}

// English, gender-neutral category slugs — used for CSV filenames and image
// folders only. The Polish display heading for each category lives in
// PartnersSection.astro.
/** The partner categories shown in the "Partnerzy" section, in display order. */
export type PartnerCategory = "program" | "community" | "patron";

const DATA_DIR = path.join(process.cwd(), "src/data");

/**
 * Maps parsed CSV rows (header + data rows) to PartnerLogo records for the
 * given category. Expected columns: name, file — file is the logo's
 * filename (with extension), expected at
 * public/images/partners/{category}/{file}.
 */
export function mapRowsToPartnerLogos(
  rows: string[][],
  category: PartnerCategory,
): PartnerLogo[] {
  const dataRows = stripBlankRows(rows);
  if (dataRows.length === 0) return [];

  const [header, ...records] = dataRows;
  const columns = header.map((col) => col.trim().toLowerCase());

  return records.map((row, index) => {
    const record: Record<string, string> = {};
    columns.forEach((col, i) => {
      record[col] = (row[i] ?? "").trim();
    });

    const file = record.file ?? "";

    return {
      index,
      name: record.name ?? "",
      file,
      image: file ? `/images/partners/${category}/${file}` : "",
    };
  });
}

/**
 * Reads a partner category from src/data/partners-{category}.csv. In dev,
 * falls back to the committed src/data/partners-{category}.dummy.csv when
 * the real file isn't present yet. In production builds, a missing or empty
 * partners-{category}.csv yields no logos — the caller should then render
 * nothing for that category rather than shipping placeholder data.
 */
export function getPartnerLogos(category: PartnerCategory): PartnerLogo[] {
  const realPath = path.join(DATA_DIR, `partners-${category}.csv`);
  const dummyPath = path.join(DATA_DIR, `partners-${category}.dummy.csv`);

  const hasRealCsv = existsSync(realPath);
  if (!hasRealCsv && !import.meta.env.DEV) return [];

  const csvPath = hasRealCsv ? realPath : dummyPath;
  const raw = readFileSync(csvPath, "utf-8");
  return mapRowsToPartnerLogos(parseCsv(raw), category);
}
