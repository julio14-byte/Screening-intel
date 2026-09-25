/** CSV mínimo: comillas, BOM y ; de Excel LATAM. */

export function detectCsvDelimiter(headerLine: string): "," | ";" {
  const withoutQuotes = headerLine.replace(/"[^"]*"/g, "");
  const semi = (withoutQuotes.match(/;/g) ?? []).length;
  const comma = (withoutQuotes.match(/,/g) ?? []).length;
  return semi > comma ? ";" : ",";
}

export function splitCsvLine(line: string, delimiter: "," | ";"): string[] {
  const cells: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (ch === delimiter && !inQuotes) {
      cells.push(current.trim());
      current = "";
      continue;
    }
    current += ch;
  }
  cells.push(current.trim());
  return cells.map((cell) => cell.replace(/^"|"$/g, "").trim());
}

export function normalizeCsvHeader(raw: string): string {
  return raw
    .replace(/^\uFEFF/, "")
    .trim()
    .toLowerCase()
    .replace(/[\s\-]+/g, "_")
    .replace(/[^\w]/g, "");
}

export type CsvTable = {
  headers: string[];
  rows: Record<string, string>[];
};

export function parseCsvTable(text: string): CsvTable {
  const lines = text
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length < 2) {
    throw new Error("El CSV debe tener cabecera y al menos una fila de datos.");
  }
  const delimiter = detectCsvDelimiter(lines[0]);
  const headers = splitCsvLine(lines[0], delimiter).map(normalizeCsvHeader);
  if (headers.some((h) => !h)) {
    throw new Error("Hay una columna sin nombre.");
  }
  const rows: Record<string, string>[] = [];
  for (let i = 1; i < lines.length; i += 1) {
    const cells = splitCsvLine(lines[i], delimiter);
    const record: Record<string, string> = {};
    headers.forEach((key, idx) => {
      record[key] = cells[idx] ?? "";
    });
    rows.push(record);
  }
  return { headers, rows };
}

export function firstFilled(
  record: Record<string, string>,
  keys: string[]
): string {
  for (const key of keys) {
    const value = (record[key] ?? "").trim();
    if (value) return value;
  }
  return "";
}
