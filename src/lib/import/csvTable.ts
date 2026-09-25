/** CSV/TSV mínimo: comillas, BOM, tabulador (pegar Excel) y ; de Excel LATAM. */

export type CsvDelimiter = "," | ";" | "\t";

export function detectCsvDelimiter(headerLine: string): CsvDelimiter {
  const withoutQuotes = headerLine.replace(/"[^"]*"/g, "");
  const tab = (withoutQuotes.match(/\t/g) ?? []).length;
  const semi = (withoutQuotes.match(/;/g) ?? []).length;
  const comma = (withoutQuotes.match(/,/g) ?? []).length;
  if (tab > 0 && tab >= semi && tab >= comma) return "\t";
  return semi > comma ? ";" : ",";
}

export function splitCsvLine(line: string, delimiter: CsvDelimiter): string[] {
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
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
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
    .map((line) => line.replace(/[ \t]+$/, ""))
    .filter((line) => line.trim().length > 0);
  if (lines.length < 2) {
    throw new Error("La tabla debe tener cabecera y al menos una fila de datos.");
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

/** Fechas de Excel/EDC: ISO, LATAM, SDTM compacta o 12-Apr-1962. */
export function parseImportDate(raw: string): string {
  const value = raw.trim();
  if (!value) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  if (/^\d{8}$/.test(value)) {
    return `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}`;
  }
  const latam = value.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})$/);
  if (latam) {
    const day = latam[1].padStart(2, "0");
    const month = latam[2].padStart(2, "0");
    return `${latam[3]}-${month}-${day}`;
  }
  const months: Record<string, string> = {
    jan: "01",
    feb: "02",
    mar: "03",
    apr: "04",
    may: "05",
    jun: "06",
    jul: "07",
    aug: "08",
    sep: "09",
    oct: "10",
    nov: "11",
    dec: "12",
  };
  const sdtm = value.match(/^(\d{1,2})[- ]([A-Za-z]{3})[- ](\d{4})$/);
  if (sdtm) {
    const month = months[sdtm[2].toLowerCase()];
    if (month) return `${sdtm[3]}-${month}-${sdtm[1].padStart(2, "0")}`;
  }
  return "";
}

export function parseLabNumber(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const num = Number(trimmed.replace(",", "."));
  return Number.isFinite(num) ? num : null;
}
