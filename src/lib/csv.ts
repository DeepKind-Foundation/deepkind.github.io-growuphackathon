/** Splits CSV text into rows of cells, honouring double-quoted fields (with "" escaping). */
export function parseCsv(raw: string): string[][] {
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

/** Drops fully blank rows (e.g. trailing newlines) from a parsed CSV. */
export function stripBlankRows(rows: string[][]): string[][] {
  return rows.filter((row) => row.some((cell) => cell.trim() !== ""));
}
