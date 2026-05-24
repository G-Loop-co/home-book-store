import { randomUUID } from "node:crypto";
import { existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { cleanIsbn, normalizeBookKey } from "@/lib/books/duplicates";
import { normalizeUiLanguage } from "@/lib/i18n";
import { dataDirectory } from "@/lib/runtime-paths";
import { normalizeVisionProviderName } from "@/lib/vision/provider-config";
import type {
  AppSettings,
  Book,
  ImportBatchImage,
  ImportBatchImageStatus,
  ImportBatch,
  ImportBatchDetail,
  ImportBatchStatus,
  ImportItem,
  ImportItemStatus,
  LibraryExportRow,
  LibraryImportRow,
  LibraryImportSummary,
  MetadataCandidate,
  VisionBook
} from "@/lib/types";

type DbRow = Record<string, unknown>;

let database: DatabaseSync | null = null;
const schemaVersion = 2;

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

export function closeDbForTests(): void {
  database?.close();
  database = null;
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

    CREATE TABLE IF NOT EXISTS import_batch_images (
      batch_id TEXT NOT NULL REFERENCES import_batches(id) ON DELETE CASCADE,
      image_path TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      attempts INTEGER NOT NULL DEFAULT 0,
      error_message TEXT NOT NULL DEFAULT '',
      last_attempt_at TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      PRIMARY KEY (batch_id, image_path)
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
      lookup_attempts INTEGER NOT NULL DEFAULT 0,
      last_lookup_attempt_at TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_books_normalized_key ON books(normalized_key);
    CREATE INDEX IF NOT EXISTS idx_books_isbn10 ON books(isbn10);
    CREATE INDEX IF NOT EXISTS idx_books_isbn13 ON books(isbn13);
    CREATE INDEX IF NOT EXISTS idx_copies_book_status ON copies(book_id, status);
    CREATE INDEX IF NOT EXISTS idx_import_items_batch ON import_items(batch_id);
    CREATE INDEX IF NOT EXISTS idx_import_batch_images_status ON import_batch_images(batch_id, status);

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL DEFAULT '',
      updated_at TEXT NOT NULL
    );
  `);

  migrateSchema(db);
}

function tableColumns(db: DatabaseSync, tableName: string): Set<string> {
  const rows = db.prepare(`PRAGMA table_info(${tableName})`).all() as DbRow[];
  return new Set(rows.map((row) => asString(row.name)));
}

function addColumnIfMissing(db: DatabaseSync, tableName: string, columnName: string, definition: string): void {
  if (!tableColumns(db, tableName).has(columnName)) {
    db.exec(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${definition};`);
  }
}

function userVersion(db: DatabaseSync): number {
  const row = db.prepare("PRAGMA user_version").get() as DbRow | undefined;
  return Number(row?.user_version ?? 0);
}

function setUserVersion(db: DatabaseSync, version: number): void {
  db.exec(`PRAGMA user_version = ${version};`);
}

function migrateSchema(db: DatabaseSync): void {
  const version = userVersion(db);

  if (version < 1) {
    setUserVersion(db, 1);
  }

  if (version < 2) {
    addColumnIfMissing(db, "import_items", "lookup_attempts", "INTEGER NOT NULL DEFAULT 0");
    addColumnIfMissing(db, "import_items", "last_lookup_attempt_at", "TEXT NOT NULL DEFAULT ''");
    db.exec(`
      CREATE TABLE IF NOT EXISTS import_batch_images (
        batch_id TEXT NOT NULL REFERENCES import_batches(id) ON DELETE CASCADE,
        image_path TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        attempts INTEGER NOT NULL DEFAULT 0,
        error_message TEXT NOT NULL DEFAULT '',
        last_attempt_at TEXT NOT NULL DEFAULT '',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        PRIMARY KEY (batch_id, image_path)
      );

      CREATE INDEX IF NOT EXISTS idx_import_batch_images_status ON import_batch_images(batch_id, status);
    `);
    setUserVersion(db, 2);
  }

  if (userVersion(db) < schemaVersion) {
    setUserVersion(db, schemaVersion);
  }
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
  return normalizeVisionProviderName(value);
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
    grokApiKey: process.env.GROK_API_KEY || process.env.XAI_API_KEY || "",
    grokBaseUrl: process.env.GROK_BASE_URL || process.env.XAI_BASE_URL || "https://api.x.ai/v1",
    grokVisionModel: process.env.GROK_VISION_MODEL || "grok-2-vision-1212",
    grokMaxTokens: process.env.GROK_MAX_TOKENS || "2000",
    geminiApiKey: process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY || "",
    geminiVisionModel: process.env.GEMINI_VISION_MODEL || "gemini-2.0-flash",
    geminiMaxTokens: process.env.GEMINI_MAX_TOKENS || "2000",
    claudeApiKey: process.env.CLAUDE_API_KEY || process.env.ANTHROPIC_API_KEY || "",
    claudeVisionModel: process.env.CLAUDE_VISION_MODEL || "claude-3-5-sonnet-latest",
    claudeMaxTokens: process.env.CLAUDE_MAX_TOKENS || "2000",
    googleBooksApiKey: process.env.GOOGLE_BOOKS_API_KEY || "",
    isbndbApiKey: process.env.ISBNDB_API_KEY || "",
    naverClientId: process.env.NAVER_CLIENT_ID || "",
    naverClientSecret: process.env.NAVER_CLIENT_SECRET || "",
    rakutenApplicationId: process.env.RAKUTEN_APPLICATION_ID || "",
    rakutenAccessKey: process.env.RAKUTEN_ACCESS_KEY || ""
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
  "grokApiKey",
  "grokBaseUrl",
  "grokVisionModel",
  "grokMaxTokens",
  "geminiApiKey",
  "geminiVisionModel",
  "geminiMaxTokens",
  "claudeApiKey",
  "claudeVisionModel",
  "claudeMaxTokens",
  "googleBooksApiKey",
  "isbndbApiKey",
  "naverClientId",
  "naverClientSecret",
  "rakutenApplicationId",
  "rakutenAccessKey"
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

function rowToBatchImage(row: DbRow): ImportBatchImage {
  return {
    batchId: asString(row.batch_id),
    imagePath: asString(row.image_path),
    status: asString(row.status) as ImportBatchImageStatus,
    attempts: Number(row.attempts ?? 0),
    errorMessage: asString(row.error_message),
    lastAttemptAt: asString(row.last_attempt_at),
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
    lookupAttempts: Number(row.lookup_attempts ?? 0),
    lastLookupAttemptAt: asString(row.last_lookup_attempt_at),
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
    ensureImportBatchImageRows(id, imagePaths, timestamp);

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

export function ensureImportBatchImageRows(batchId: string, imagePaths: string[], timestamp = now()): void {
  const insert = getDb().prepare(
    `INSERT OR IGNORE INTO import_batch_images (batch_id, image_path, status, created_at, updated_at)
     VALUES (?, ?, 'pending', ?, ?)`
  );

  for (const imagePath of imagePaths) {
    insert.run(batchId, imagePath, timestamp, timestamp);
  }
}

export function getImportBatchImages(batchId: string): ImportBatchImage[] {
  const rows = getDb()
    .prepare("SELECT * FROM import_batch_images WHERE batch_id = ? ORDER BY created_at ASC, image_path ASC")
    .all(batchId) as DbRow[];
  return rows.map(rowToBatchImage);
}

export function resumableImportBatchImages(batchId: string): ImportBatchImage[] {
  return getImportBatchImages(batchId).filter((image) => image.status !== "succeeded");
}

export function markImportBatchImageAnalyzing(batchId: string, imagePath: string): void {
  const timestamp = now();
  getDb()
    .prepare(
      `UPDATE import_batch_images
       SET status = 'analyzing', attempts = attempts + 1, error_message = '', last_attempt_at = ?, updated_at = ?
       WHERE batch_id = ? AND image_path = ?`
    )
    .run(timestamp, timestamp, batchId, imagePath);
}

export function markImportBatchImageSucceeded(batchId: string, imagePath: string): void {
  const timestamp = now();
  getDb()
    .prepare("UPDATE import_batch_images SET status = 'succeeded', error_message = '', updated_at = ? WHERE batch_id = ? AND image_path = ?")
    .run(timestamp, batchId, imagePath);
}

export function markImportBatchImageFailed(batchId: string, imagePath: string, errorMessage: string): void {
  const timestamp = now();
  getDb()
    .prepare("UPDATE import_batch_images SET status = 'failed', error_message = ?, updated_at = ? WHERE batch_id = ? AND image_path = ?")
    .run(errorMessage, timestamp, batchId, imagePath);
}

export function getImportBatchDetail(id: string): ImportBatchDetail | null {
  const batch = getImportBatch(id);
  if (!batch) {
    return null;
  }

  ensureImportBatchImageRows(id, batch.imagePaths);

  const rows = getDb()
    .prepare("SELECT * FROM import_items WHERE batch_id = ? ORDER BY created_at ASC")
    .all(id) as DbRow[];

  return {
    batch,
    images: getImportBatchImages(id),
    items: rows.map(rowToImportItem)
  };
}

export function upsertImportItemsForImage(batchId: string, imagePath: string, books: VisionBook[]): ImportItem[] {
  const db = getDb();
  db.prepare("DELETE FROM import_items WHERE batch_id = ? AND image_path = ? AND status NOT IN ('confirmed', 'duplicate', 'rejected')").run(
    batchId,
    imagePath
  );

  const timestamp = now();
  const inserted: ImportItem[] = [];
  const insert = db.prepare(
    `INSERT INTO import_items (
      id, batch_id, image_path, bbox, spine_text, ai_extracted_json, confidence, status, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );

  for (const book of books) {
    const id = randomUUID();
    const status: ImportItemStatus = book.title || book.spineText ? "pending_lookup" : "needs_review";
    insert.run(
      id,
      batchId,
      imagePath,
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

  return inserted;
}

export function replaceImportItems(batchId: string, imageBooks: Array<{ imagePath: string; books: VisionBook[] }>): ImportItem[] {
  const inserted: ImportItem[] = [];
  for (const imageBook of imageBooks) {
    inserted.push(...upsertImportItemsForImage(batchId, imageBook.imagePath, imageBook.books));
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
    .prepare(
      `UPDATE import_items
       SET metadata_candidates = ?, status = ?, error_message = '', lookup_attempts = lookup_attempts + 1,
           last_lookup_attempt_at = ?, updated_at = ?
       WHERE id = ?`
    )
    .run(JSON.stringify(candidates), status, now(), now(), id);

  const item = getImportItem(id);
  if (!item) {
    throw new Error("Import item not found after candidate update.");
  }

  return item;
}

export function markImportItemLookupFailed(id: string, errorMessage: string): ImportItem {
  const timestamp = now();
  getDb()
    .prepare(
      `UPDATE import_items
       SET error_message = ?, lookup_attempts = lookup_attempts + 1, last_lookup_attempt_at = ?, updated_at = ?
       WHERE id = ?`
    )
    .run(errorMessage, timestamp, timestamp, id);

  const item = getImportItem(id);
  if (!item) {
    throw new Error("Import item not found after lookup failure update.");
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
  const currentItem = getImportItem(itemId);
  if (!currentItem) {
    throw new Error("Import item not found.");
  }

  if (currentItem?.chosenBookId && (currentItem.status === "confirmed" || currentItem.status === "duplicate")) {
    const currentBook = getBook(currentItem.chosenBookId);
    if (currentBook) {
      return { item: currentItem, book: currentBook, duplicate: currentItem.status === "duplicate" };
    }
  }

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

export function listLibraryExportRows(): LibraryExportRow[] {
  const rows = getDb()
    .prepare(
      `SELECT
         b.id AS book_id,
         b.title,
         b.authors,
         b.publisher,
         b.published_date,
         b.isbn10,
         b.isbn13,
         b.cover_url,
         b.description,
         b.source,
         b.source_id,
         b.normalized_key,
         b.created_at AS book_created_at,
         b.updated_at AS book_updated_at,
         c.id AS copy_id,
         c.status AS copy_status,
         c.location,
         c.notes,
         c.acquired_at,
         c.created_at AS copy_created_at
       FROM books b
       INNER JOIN copies c ON c.book_id = b.id AND c.status = 'owned'
       ORDER BY lower(b.title), b.created_at, c.created_at`
    )
    .all() as DbRow[];

  return rows.map((row) => ({
    bookId: asString(row.book_id),
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
    bookCreatedAt: asString(row.book_created_at),
    bookUpdatedAt: asString(row.book_updated_at),
    copyId: asString(row.copy_id),
    copyStatus: asString(row.copy_status),
    location: asString(row.location),
    notes: asString(row.notes),
    acquiredAt: asString(row.acquired_at),
    copyCreatedAt: asString(row.copy_created_at)
  }));
}

function timestampOrNow(value: string, fallback: string): string {
  return value && !Number.isNaN(Date.parse(value)) ? value : fallback;
}

function copyExists(bookId: string, input: LibraryImportRow): boolean {
  const copyId = input.copyId.trim();
  if (copyId) {
    const row = getDb().prepare("SELECT id FROM copies WHERE id = ? LIMIT 1").get(copyId) as DbRow | undefined;
    return Boolean(row);
  }

  const acquiredAt = timestampOrNow(input.acquiredAt, "");
  const row = getDb()
    .prepare(
      `SELECT id FROM copies
       WHERE book_id = ? AND status = 'owned' AND location = ? AND notes = ? AND acquired_at = ?
       LIMIT 1`
    )
    .get(bookId, input.location.trim(), input.notes.trim(), acquiredAt) as DbRow | undefined;
  return Boolean(row);
}

function insertLibraryBook(input: LibraryImportRow, timestamp: string): string {
  const bookId = randomUUID();
  const title = input.title.trim();
  const authors = input.authors.map((author) => author.trim()).filter(Boolean);
  const createdAt = timestampOrNow(input.createdAt, timestamp);
  const updatedAt = timestampOrNow(input.updatedAt, timestamp);

  getDb()
    .prepare(
      `INSERT INTO books (
        id, title, authors, publisher, published_date, isbn10, isbn13, cover_url,
        description, source, source_id, normalized_key, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      bookId,
      title,
      JSON.stringify(authors),
      input.publisher.trim(),
      input.publishedDate.trim(),
      cleanIsbn(input.isbn10),
      cleanIsbn(input.isbn13),
      input.coverUrl.trim(),
      input.description.trim(),
      input.source.trim() || "csv",
      input.sourceId.trim(),
      normalizeBookKey(title, authors),
      createdAt,
      updatedAt
    );

  return bookId;
}

function mergeLibraryBook(bookId: string, input: LibraryImportRow, timestamp: string): void {
  getDb()
    .prepare(
      `UPDATE books
       SET publisher = CASE WHEN publisher = '' THEN ? ELSE publisher END,
           published_date = CASE WHEN published_date = '' THEN ? ELSE published_date END,
           isbn10 = CASE WHEN isbn10 = '' THEN ? ELSE isbn10 END,
           isbn13 = CASE WHEN isbn13 = '' THEN ? ELSE isbn13 END,
           cover_url = CASE WHEN cover_url = '' THEN ? ELSE cover_url END,
           description = CASE WHEN description = '' THEN ? ELSE description END,
           source = CASE WHEN source = '' THEN ? ELSE source END,
           source_id = CASE WHEN source_id = '' THEN ? ELSE source_id END,
           updated_at = ?
       WHERE id = ?`
    )
    .run(
      input.publisher.trim(),
      input.publishedDate.trim(),
      cleanIsbn(input.isbn10),
      cleanIsbn(input.isbn13),
      input.coverUrl.trim(),
      input.description.trim(),
      input.source.trim() || "csv",
      input.sourceId.trim(),
      timestampOrNow(input.updatedAt, timestamp),
      bookId
    );
}

function insertLibraryCopy(bookId: string, input: LibraryImportRow, timestamp: string): void {
  const acquiredAt = timestampOrNow(input.acquiredAt, "");
  const copyId = input.copyId.trim() || randomUUID();
  getDb()
    .prepare(
      `INSERT INTO copies (id, book_id, status, location, notes, acquired_at, created_at)
       VALUES (?, ?, 'owned', ?, ?, ?, ?)`
    )
    .run(copyId, bookId, input.location.trim(), input.notes.trim(), acquiredAt, timestamp);
}

export function importLibraryRows(rows: LibraryImportRow[]): LibraryImportSummary {
  const db = getDb();
  const summary: LibraryImportSummary = {
    rows: rows.length,
    createdBooks: 0,
    mergedBooks: 0,
    createdCopies: 0,
    skippedCopies: 0,
    errors: []
  };

  db.exec("BEGIN");
  try {
    for (const [index, row] of rows.entries()) {
      const title = row.title.trim();
      if (!title) {
        summary.errors.push({ row: index + 2, message: "Title is required." });
        continue;
      }

      const timestamp = now();
      const existing = findExistingBook({
        title,
        authors: row.authors,
        isbn10: row.isbn10,
        isbn13: row.isbn13
      });
      const bookId = existing?.id ?? insertLibraryBook(row, timestamp);

      if (existing) {
        mergeLibraryBook(existing.id, row, timestamp);
        summary.mergedBooks += 1;
      } else {
        summary.createdBooks += 1;
      }

      if (copyExists(bookId, row)) {
        summary.skippedCopies += 1;
        continue;
      }

      insertLibraryCopy(bookId, row, timestamp);
      summary.createdCopies += 1;
    }

    db.exec("COMMIT");
    return summary;
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}
