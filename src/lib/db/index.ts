import { randomUUID } from "node:crypto";
import { existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { cleanIsbn, normalizeBookKey } from "@/lib/books/duplicates";
import { normalizeUiLanguage } from "@/lib/i18n";
import { dataDirectory } from "@/lib/runtime-paths";
import type {
  AppSettings,
  Book,
  ImportBatch,
  ImportBatchDetail,
  ImportBatchStatus,
  ImportItem,
  ImportItemStatus,
  MetadataCandidate,
  VisionBook
} from "@/lib/types";

type DbRow = Record<string, unknown>;

let database: DatabaseSync | null = null;

function now(): string {
  return new Date().toISOString();
}

function dbPath(): string {
  const configured = process.env.HOME_BOOK_STORE_DB_PATH || process.env.BOOK_STORE_DB_PATH;
  if (!configured) {
    return path.join(dataDirectory(), "home-book-store.sqlite");
  }

  if (path.isAbsolute(configured)) {
    return configured;
  }

  const relativePath = configured.replace(/^\.data[\\/]/, "");
  return path.join(dataDirectory(), relativePath);
}

function ensureParentDirectory(filePath: string): void {
  const parent = path.dirname(filePath);
  if (!existsSync(parent)) {
    mkdirSync(parent, { recursive: true });
  }
}

export function getDb(): DatabaseSync {
  if (database) {
    return database;
  }

  const filePath = dbPath();
  ensureParentDirectory(filePath);
  database = new DatabaseSync(filePath);
  database.exec("PRAGMA journal_mode = WAL;");
  database.exec("PRAGMA foreign_keys = ON;");
  initializeSchema(database);
  return database;
}

function initializeSchema(db: DatabaseSync): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS books (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      authors TEXT NOT NULL DEFAULT '[]',
      publisher TEXT NOT NULL DEFAULT '',
      published_date TEXT NOT NULL DEFAULT '',
      isbn10 TEXT NOT NULL DEFAULT '',
      isbn13 TEXT NOT NULL DEFAULT '',
      cover_url TEXT NOT NULL DEFAULT '',
      description TEXT NOT NULL DEFAULT '',
      source TEXT NOT NULL DEFAULT '',
      source_id TEXT NOT NULL DEFAULT '',
      normalized_key TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS copies (
      id TEXT PRIMARY KEY,
      book_id TEXT NOT NULL REFERENCES books(id) ON DELETE CASCADE,
      status TEXT NOT NULL DEFAULT 'owned',
      location TEXT NOT NULL DEFAULT '',
      notes TEXT NOT NULL DEFAULT '',
      acquired_at TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS import_batches (
      id TEXT PRIMARY KEY,
      status TEXT NOT NULL,
      image_paths TEXT NOT NULL DEFAULT '[]',
      image_count INTEGER NOT NULL DEFAULT 0,
      error_message TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS import_items (
      id TEXT PRIMARY KEY,
      batch_id TEXT NOT NULL REFERENCES import_batches(id) ON DELETE CASCADE,
      image_path TEXT NOT NULL,
      crop_path TEXT NOT NULL DEFAULT '',
      bbox TEXT NOT NULL DEFAULT '',
      spine_text TEXT NOT NULL DEFAULT '',
      ai_extracted_json TEXT NOT NULL DEFAULT '',
      metadata_candidates TEXT NOT NULL DEFAULT '[]',
      confidence REAL NOT NULL DEFAULT 0,
      status TEXT NOT NULL,
      chosen_book_id TEXT NOT NULL DEFAULT '',
      error_message TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_books_normalized_key ON books(normalized_key);
    CREATE INDEX IF NOT EXISTS idx_books_isbn10 ON books(isbn10);
    CREATE INDEX IF NOT EXISTS idx_books_isbn13 ON books(isbn13);
    CREATE INDEX IF NOT EXISTS idx_copies_book_status ON copies(book_id, status);
    CREATE INDEX IF NOT EXISTS idx_import_items_batch ON import_items(batch_id);

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL DEFAULT '',
      updated_at TEXT NOT NULL
    );
  `);
}

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function asNumber(value: unknown): number {
  return typeof value === "number" ? value : 0;
}

function parseJson<T>(value: unknown, fallback: T): T {
  if (typeof value !== "string" || !value) {
    return fallback;
  }

  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function normalizeVisionProvider(value: string | undefined): AppSettings["visionProvider"] {
  return value?.toLowerCase() === "openai" ? "openai" : "opencode-go";
}

function defaultAppSettings(): AppSettings {
  return {
    uiLanguage: normalizeUiLanguage(process.env.UI_LANGUAGE),
    visionProvider: normalizeVisionProvider(process.env.VISION_PROVIDER),
    visionApiKey: process.env.VISION_API_KEY || "",
    opencodeGoApiKey: process.env.OPENCODE_GO_API_KEY || process.env.VISION_API_KEY || "",
    opencodeGoBaseUrl: process.env.OPENCODE_GO_BASE_URL || "https://opencode.ai/zen/go/v1",
    opencodeGoVisionModel: process.env.OPENCODE_GO_VISION_MODEL || "mimo-v2.5",
    opencodeGoMaxTokens: process.env.OPENCODE_GO_MAX_TOKENS || "2000",
    openaiApiKey: process.env.OPENAI_API_KEY || "",
    openaiVisionModel: process.env.OPENAI_VISION_MODEL || "gpt-4.1-mini",
    googleBooksApiKey: process.env.GOOGLE_BOOKS_API_KEY || ""
  };
}

const appSettingKeys = new Set<keyof AppSettings>([
  "uiLanguage",
  "visionProvider",
  "visionApiKey",
  "opencodeGoApiKey",
  "opencodeGoBaseUrl",
  "opencodeGoVisionModel",
  "opencodeGoMaxTokens",
  "openaiApiKey",
  "openaiVisionModel",
  "googleBooksApiKey"
]);

export function getAppSettings(): AppSettings {
  const settings = defaultAppSettings();
  const rows = getDb().prepare("SELECT key, value FROM settings").all() as DbRow[];

  for (const row of rows) {
    const key = asString(row.key) as keyof AppSettings;
    if (!appSettingKeys.has(key)) {
      continue;
    }

    if (key === "visionProvider") {
      settings.visionProvider = normalizeVisionProvider(asString(row.value));
      continue;
    }
    if (key === "uiLanguage") {
      settings.uiLanguage = normalizeUiLanguage(asString(row.value));
      continue;
    }

    settings[key] = asString(row.value) as never;
  }

  return settings;
}

export function saveAppSettings(input: Partial<AppSettings>): AppSettings {
  const statement = getDb().prepare(
    `INSERT INTO settings (key, value, updated_at)
     VALUES (?, ?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`
  );
  const timestamp = now();

  for (const [key, rawValue] of Object.entries(input)) {
    if (!appSettingKeys.has(key as keyof AppSettings)) {
      continue;
    }
    const value =
      key === "visionProvider"
        ? normalizeVisionProvider(String(rawValue))
        : key === "uiLanguage"
          ? normalizeUiLanguage(String(rawValue))
          : String(rawValue ?? "");
    statement.run(key, value, timestamp);
  }

  return getAppSettings();
}

function rowToBook(row: DbRow): Book {
  return {
    id: asString(row.id),
    title: asString(row.title),
    authors: parseJson<string[]>(row.authors, []),
    publisher: asString(row.publisher),
    publishedDate: asString(row.published_date),
    isbn10: asString(row.isbn10),
    isbn13: asString(row.isbn13),
    coverUrl: asString(row.cover_url),
    description: asString(row.description),
    source: asString(row.source),
    sourceId: asString(row.source_id),
    normalizedKey: asString(row.normalized_key),
    ownedCount: asNumber(row.owned_count),
    createdAt: asString(row.created_at),
    updatedAt: asString(row.updated_at)
  };
}

function rowToBatch(row: DbRow): ImportBatch {
  return {
    id: asString(row.id),
    status: asString(row.status) as ImportBatchStatus,
    imagePaths: parseJson<string[]>(row.image_paths, []),
    imageCount: Number(row.image_count ?? 0),
    errorMessage: asString(row.error_message),
    createdAt: asString(row.created_at),
    updatedAt: asString(row.updated_at)
  };
}

function rowToImportItem(row: DbRow): ImportItem {
  return {
    id: asString(row.id),
    batchId: asString(row.batch_id),
    imagePath: asString(row.image_path),
    cropPath: asString(row.crop_path),
    bbox: parseJson(row.bbox, null),
    spineText: asString(row.spine_text),
    aiExtractedJson: parseJson(row.ai_extracted_json, null),
    metadataCandidates: parseJson<MetadataCandidate[]>(row.metadata_candidates, []),
    confidence: Number(row.confidence ?? 0),
    status: asString(row.status) as ImportItemStatus,
    chosenBookId: asString(row.chosen_book_id),
    errorMessage: asString(row.error_message),
    createdAt: asString(row.created_at),
    updatedAt: asString(row.updated_at)
  };
}

export function createImportBatch(imagePaths: string[], id = randomUUID()): ImportBatch {
  const db = getDb();
  const timestamp = now();

  db.prepare(
    `INSERT INTO import_batches (id, status, image_paths, image_count, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(id, "uploaded", JSON.stringify(imagePaths), imagePaths.length, timestamp, timestamp);

  const batch = getImportBatch(id);
  if (!batch) {
    throw new Error("Failed to create import batch.");
  }

  return batch;
}

export function getImportBatch(id: string): ImportBatch | null {
  const row = getDb().prepare("SELECT * FROM import_batches WHERE id = ?").get(id) as DbRow | undefined;
  return row ? rowToBatch(row) : null;
}

export function setBatchStatus(id: string, status: ImportBatchStatus, errorMessage = ""): void {
  getDb()
    .prepare("UPDATE import_batches SET status = ?, error_message = ?, updated_at = ? WHERE id = ?")
    .run(status, errorMessage, now(), id);
}

export function getImportBatchDetail(id: string): ImportBatchDetail | null {
  const batch = getImportBatch(id);
  if (!batch) {
    return null;
  }

  const rows = getDb()
    .prepare("SELECT * FROM import_items WHERE batch_id = ? ORDER BY created_at ASC")
    .all(id) as DbRow[];

  return {
    batch,
    items: rows.map(rowToImportItem)
  };
}

export function replaceImportItems(batchId: string, imageBooks: Array<{ imagePath: string; books: VisionBook[] }>): ImportItem[] {
  const db = getDb();
  db.prepare("DELETE FROM import_items WHERE batch_id = ? AND status NOT IN ('confirmed', 'duplicate')").run(batchId);

  const timestamp = now();
  const inserted: ImportItem[] = [];
  const insert = db.prepare(
    `INSERT INTO import_items (
      id, batch_id, image_path, bbox, spine_text, ai_extracted_json, confidence, status, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );

  for (const imageBook of imageBooks) {
    for (const book of imageBook.books) {
      const id = randomUUID();
      const status: ImportItemStatus = book.title || book.spineText ? "pending_lookup" : "needs_review";
      insert.run(
        id,
        batchId,
        imageBook.imagePath,
        JSON.stringify(book.bbox),
        book.spineText,
        JSON.stringify(book),
        book.confidence,
        status,
        timestamp,
        timestamp
      );

      const item = getImportItem(id);
      if (item) {
        inserted.push(item);
      }
    }
  }

  setBatchStatus(batchId, "needs_review");
  return inserted;
}

export function getImportItem(id: string): ImportItem | null {
  const row = getDb().prepare("SELECT * FROM import_items WHERE id = ?").get(id) as DbRow | undefined;
  return row ? rowToImportItem(row) : null;
}

export function updateImportItemCandidates(id: string, candidates: MetadataCandidate[], status: ImportItemStatus = "needs_review"): ImportItem {
  getDb()
    .prepare("UPDATE import_items SET metadata_candidates = ?, status = ?, updated_at = ? WHERE id = ?")
    .run(JSON.stringify(candidates), status, now(), id);

  const item = getImportItem(id);
  if (!item) {
    throw new Error("Import item not found after candidate update.");
  }

  return item;
}

export function rejectImportItem(id: string): ImportItem {
  getDb().prepare("UPDATE import_items SET status = ?, updated_at = ? WHERE id = ?").run("rejected", now(), id);
  const item = getImportItem(id);
  if (!item) {
    throw new Error("Import item not found after reject.");
  }

  return item;
}

function countOwnedCopies(bookId: string): number {
  const row = getDb().prepare("SELECT COUNT(*) AS count FROM copies WHERE book_id = ? AND status = 'owned'").get(bookId) as
    | DbRow
    | undefined;
  return Number(row?.count ?? 0);
}

export function findExistingBook(input: {
  title: string;
  authors: string[];
  isbn10?: string;
  isbn13?: string;
}): Book | null {
  const db = getDb();
  const isbns = [cleanIsbn(input.isbn13), cleanIsbn(input.isbn10)].filter(Boolean);

  for (const isbn of isbns) {
    const row = db
      .prepare(
        `SELECT b.*, COUNT(c.id) AS owned_count
         FROM books b
         LEFT JOIN copies c ON c.book_id = b.id AND c.status = 'owned'
         WHERE b.isbn13 = ? OR b.isbn10 = ?
         GROUP BY b.id
         LIMIT 1`
      )
      .get(isbn, isbn) as DbRow | undefined;
    if (row) {
      return rowToBook(row);
    }
  }

  const normalizedKey = normalizeBookKey(input.title, input.authors);
  if (!normalizedKey.startsWith("::")) {
    const row = db
      .prepare(
        `SELECT b.*, COUNT(c.id) AS owned_count
         FROM books b
         LEFT JOIN copies c ON c.book_id = b.id AND c.status = 'owned'
         WHERE b.normalized_key = ?
         GROUP BY b.id
         LIMIT 1`
      )
      .get(normalizedKey) as DbRow | undefined;
    if (row) {
      return rowToBook(row);
    }
  }

  return null;
}

export function markOwnedCandidates(candidates: MetadataCandidate[]): MetadataCandidate[] {
  return candidates.map((candidate) => {
    const existing = findExistingBook({
      title: candidate.title,
      authors: candidate.authors,
      isbn10: candidate.isbn10,
      isbn13: candidate.isbn13
    });
    return existing && existing.ownedCount > 0 ? { ...candidate, ownedBookId: existing.id } : candidate;
  });
}

export function confirmImportItem(
  itemId: string,
  candidate: MetadataCandidate,
  options: { location?: string; notes?: string } = {}
): { item: ImportItem; book: Book; duplicate: boolean } {
  const db = getDb();
  const timestamp = now();
  const authors = candidate.authors.filter(Boolean);
  const normalizedKey = normalizeBookKey(candidate.title, authors);
  const existing = findExistingBook({
    title: candidate.title,
    authors,
    isbn10: candidate.isbn10,
    isbn13: candidate.isbn13
  });

  let bookId = existing?.id ?? randomUUID();
  let duplicate = false;

  if (!existing) {
    db.prepare(
      `INSERT INTO books (
        id, title, authors, publisher, published_date, isbn10, isbn13, cover_url,
        description, source, source_id, normalized_key, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      bookId,
      candidate.title,
      JSON.stringify(authors),
      candidate.publisher,
      candidate.publishedDate,
      cleanIsbn(candidate.isbn10),
      cleanIsbn(candidate.isbn13),
      candidate.coverUrl,
      candidate.description,
      candidate.source,
      candidate.sourceId,
      normalizedKey,
      timestamp,
      timestamp
    );
  } else {
    duplicate = existing.ownedCount > 0;
    bookId = existing.id;
  }

  if (!duplicate && countOwnedCopies(bookId) === 0) {
    db.prepare(
      `INSERT INTO copies (id, book_id, status, location, notes, acquired_at, created_at)
       VALUES (?, ?, 'owned', ?, ?, ?, ?)`
    ).run(randomUUID(), bookId, options.location ?? "", options.notes ?? "", timestamp, timestamp);
  }

  const status: ImportItemStatus = duplicate ? "duplicate" : "confirmed";
  db.prepare("UPDATE import_items SET status = ?, chosen_book_id = ?, updated_at = ? WHERE id = ?").run(status, bookId, timestamp, itemId);

  const row = db
    .prepare(
      `SELECT b.*, COUNT(c.id) AS owned_count
       FROM books b
       LEFT JOIN copies c ON c.book_id = b.id AND c.status = 'owned'
       WHERE b.id = ?
       GROUP BY b.id`
    )
    .get(bookId) as DbRow | undefined;
  const item = getImportItem(itemId);

  if (!row || !item) {
    throw new Error("Failed to confirm import item.");
  }

  return { item, book: rowToBook(row), duplicate };
}

export function getBook(id: string): Book | null {
  const row = getDb()
    .prepare(
      `SELECT b.*, COUNT(c.id) AS owned_count
       FROM books b
       LEFT JOIN copies c ON c.book_id = b.id AND c.status = 'owned'
       WHERE b.id = ?
       GROUP BY b.id`
    )
    .get(id) as DbRow | undefined;

  return row ? rowToBook(row) : null;
}

export function updateBook(
  id: string,
  input: {
    title: string;
    authors: string[];
    publisher?: string;
    publishedDate?: string;
    isbn10?: string;
    isbn13?: string;
    coverUrl?: string;
    description?: string;
  }
): Book {
  const title = input.title.trim();
  const authors = input.authors.map((author) => author.trim()).filter(Boolean);
  const timestamp = now();

  getDb()
    .prepare(
      `UPDATE books
       SET title = ?,
           authors = ?,
           publisher = ?,
           published_date = ?,
           isbn10 = ?,
           isbn13 = ?,
           cover_url = ?,
           description = ?,
           normalized_key = ?,
           updated_at = ?
       WHERE id = ?`
    )
    .run(
      title,
      JSON.stringify(authors),
      input.publisher?.trim() ?? "",
      input.publishedDate?.trim() ?? "",
      cleanIsbn(input.isbn10),
      cleanIsbn(input.isbn13),
      input.coverUrl?.trim() ?? "",
      input.description?.trim() ?? "",
      normalizeBookKey(title, authors),
      timestamp,
      id
    );

  const book = getBook(id);
  if (!book) {
    throw new Error("Book not found after update.");
  }

  return book;
}

export function deleteBook(id: string): boolean {
  const result = getDb().prepare("DELETE FROM books WHERE id = ?").run(id);
  return result.changes > 0;
}

export function listBooks(options: { query?: string; owned?: boolean } = {}): Book[] {
  const query = options.query?.trim() ?? "";
  const params: string[] = [];
  const where: string[] = [];

  if (query) {
    const like = `%${query.toLowerCase()}%`;
    where.push(
      "(lower(b.title) LIKE ? OR lower(b.authors) LIKE ? OR lower(b.publisher) LIKE ? OR lower(b.description) LIKE ? OR b.isbn10 LIKE ? OR b.isbn13 LIKE ?)"
    );
    params.push(like, like, like, like, like, like);
  }

  if (options.owned) {
    where.push("EXISTS (SELECT 1 FROM copies c2 WHERE c2.book_id = b.id AND c2.status = 'owned')");
  }

  const sql = `
    SELECT b.*, COUNT(c.id) AS owned_count
    FROM books b
    LEFT JOIN copies c ON c.book_id = b.id AND c.status = 'owned'
    ${where.length > 0 ? `WHERE ${where.join(" AND ")}` : ""}
    GROUP BY b.id
    ORDER BY b.updated_at DESC
    LIMIT 200
  `;

  return (getDb().prepare(sql).all(...params) as DbRow[]).map(rowToBook);
}
