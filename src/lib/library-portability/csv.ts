import { cleanIsbn } from "@/lib/books/duplicates";
import type { LibraryExportRow, LibraryImportRow } from "@/lib/types";

export interface LibraryCsvParseResult {
  rows: LibraryImportRow[];
  errors: Array<{ row: number; message: string }>;
}

const headers = [
  "copyId",
  "title",
  "authors",
  "publisher",
  "publishedDate",
  "isbn10",
  "isbn13",
  "coverUrl",
  "description",
  "source",
  "sourceId",
  "location",
  "notes",
  "acquiredAt",
  "createdAt",
  "updatedAt"
] as const;

type Header = (typeof headers)[number];

type CsvRecord = Record<Header, string>;

const requiredHeaders = headers.filter((header) => header !== "copyId");

function spreadsheetSafeValue(value: string): string {
  return /^[=+\-@\t\r]/.test(value) ? `\t${value}` : value;
}

function escapeCsvCell(value: string): string {
  const safeValue = spreadsheetSafeValue(value);
  if (!/[",\n\r\t]/.test(safeValue)) {
    return safeValue;
  }

  return `"${safeValue.replace(/"/g, '""')}"`;
}

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (inQuotes) {
      if (char === '"' && next === '"') {
        cell += '"';
        index += 1;
        continue;
      }
      if (char === '"') {
        inQuotes = false;
        continue;
      }
      cell += char;
      continue;
    }

    if (char === '"') {
      inQuotes = true;
      continue;
    }

    if (char === ",") {
      row.push(cell);
      cell = "";
      continue;
    }

    if (char === "\n") {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
      continue;
    }

    if (char === "\r") {
      continue;
    }

    cell += char;
  }

  if (inQuotes) {
    throw new Error("CSV contains an unclosed quoted field.");
  }

  if (cell || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }

  return rows.filter((entry) => entry.some((value) => value.trim() !== ""));
}

function parseAuthors(value: string): string[] {
  const trimmed = value.trim();
  if (!trimmed) {
    return [];
  }

  if (trimmed.startsWith("[")) {
    try {
      const parsed = JSON.parse(trimmed) as unknown;
      if (Array.isArray(parsed)) {
        return parsed.map((author) => String(author).trim()).filter(Boolean);
      }
    } catch {
      // Fall through to delimiter parsing for hand-edited CSV files.
    }
  }

  return trimmed
    .split(/[;,，、]/)
    .map((author) => author.trim())
    .filter(Boolean);
}

function recordToImportRow(record: CsvRecord): LibraryImportRow {
  return {
    copyId: record.copyId.trim(),
    title: record.title.trim(),
    authors: parseAuthors(record.authors),
    publisher: record.publisher.trim(),
    publishedDate: record.publishedDate.trim(),
    isbn10: cleanIsbn(record.isbn10),
    isbn13: cleanIsbn(record.isbn13),
    coverUrl: record.coverUrl.trim(),
    description: record.description.trim(),
    source: record.source.trim() || "csv",
    sourceId: record.sourceId.trim(),
    location: record.location.trim(),
    notes: record.notes.trim(),
    acquiredAt: record.acquiredAt.trim(),
    createdAt: record.createdAt.trim(),
    updatedAt: record.updatedAt.trim()
  };
}

export function serializeLibraryCsv(rows: LibraryExportRow[]): string {
  const lines = [headers.join(",")];

  for (const row of rows) {
    const record: CsvRecord = {
      copyId: row.copyId,
      title: row.title,
      authors: JSON.stringify(row.authors),
      publisher: row.publisher,
      publishedDate: row.publishedDate,
      isbn10: row.isbn10,
      isbn13: row.isbn13,
      coverUrl: row.coverUrl,
      description: row.description,
      source: row.source,
      sourceId: row.sourceId,
      location: row.location,
      notes: row.notes,
      acquiredAt: row.acquiredAt,
      createdAt: row.bookCreatedAt,
      updatedAt: row.bookUpdatedAt
    };

    lines.push(headers.map((header) => escapeCsvCell(record[header])).join(","));
  }

  return `${lines.join("\r\n")}\r\n`;
}

export function parseLibraryCsv(text: string): LibraryCsvParseResult {
  const errors: Array<{ row: number; message: string }> = [];
  let rawRows: string[][];

  try {
    rawRows = parseCsv(text.replace(/^\uFEFF/, ""));
  } catch (error) {
    return {
      rows: [],
      errors: [{ row: 1, message: error instanceof Error ? error.message : "CSV parsing failed." }]
    };
  }

  if (rawRows.length === 0) {
    return { rows: [], errors: [{ row: 1, message: "CSV file is empty." }] };
  }

  const incomingHeaders = rawRows[0]!.map((header) => header.trim());
  const missingHeaders = requiredHeaders.filter((header) => !incomingHeaders.includes(header));
  if (missingHeaders.length > 0) {
    return {
      rows: [],
      errors: [{ row: 1, message: `Missing required CSV columns: ${missingHeaders.join(", ")}.` }]
    };
  }

  const rows: LibraryImportRow[] = [];
  for (const [index, rawRow] of rawRows.slice(1).entries()) {
    const record = Object.fromEntries(headers.map((header) => [header, ""])) as CsvRecord;
    for (const [columnIndex, value] of rawRow.entries()) {
      const header = incomingHeaders[columnIndex];
      if (headers.includes(header as Header)) {
        record[header as Header] = value;
      }
    }

    const rowNumber = index + 2;
    const parsed = recordToImportRow(record);
    if (!parsed.title) {
      errors.push({ row: rowNumber, message: "Title is required." });
      continue;
    }
    rows.push(parsed);
  }

  return { rows, errors };
}
