import { randomUUID } from "node:crypto";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  closeDbForTests,
  confirmImportItem,
  createImportBatch,
  deleteBook,
  getAppSettings,
  getBook,
  getDb,
  importLibraryRows,
  listBooks,
  listLibraryExportRows,
  replaceImportItems,
  saveAppSettings,
  updateBook
} from "@/lib/db";
import { parseLibraryCsv, serializeLibraryCsv } from "@/lib/library-portability/csv";
import type { LibraryExportRow, MetadataCandidate, VisionBook } from "@/lib/types";

function testDbPath(): string {
  const directory = path.join(process.cwd(), ".data");
  mkdirSync(directory, { recursive: true });
  return path.join(directory, `test-${randomUUID()}.sqlite`);
}

beforeEach(() => {
  closeDbForTests();
  process.env.BOOK_STORE_DB_PATH = testDbPath();
});

afterEach(() => {
  closeDbForTests();
});

const visionBook: VisionBook = {
  title: "Slightly Out of Focus",
  author: "Robert Capa",
  publisher: "",
  language: "en",
  spineText: "Slightly Out of Focus Robert Capa",
  isbn: "9780375753961",
  bbox: { x: 0.1, y: 0.1, width: 0.2, height: 0.8 },
  confidence: 0.95,
  notes: ""
};

const candidate: MetadataCandidate = {
  id: "google:9780375753961",
  title: "Slightly Out of Focus",
  authors: ["Robert Capa"],
  publisher: "Modern Library",
  publishedDate: "2001",
  isbn10: "0375753966",
  isbn13: "9780375753961",
  coverUrl: "",
  description: "",
  source: "google_books",
  sourceId: "9780375753961",
  score: 1
};

describe("SQLite import confirmation", () => {
  it("persists the UI language setting", () => {
    expect(getAppSettings().uiLanguage).toBe("zh-Hant");
    expect(saveAppSettings({ uiLanguage: "en" }).uiLanguage).toBe("en");
    expect(getAppSettings().uiLanguage).toBe("en");
    expect(saveAppSettings({ uiLanguage: "not-supported" as never }).uiLanguage).toBe("zh-Hant");
  });

  it("persists optional keyed metadata source settings", () => {
    const saved = saveAppSettings({
      isbndbApiKey: "isbn-key",
      naverClientId: "naver-id",
      naverClientSecret: "naver-secret",
      rakutenApplicationId: "rakuten-app",
      rakutenAccessKey: "rakuten-access"
    });

    expect(saved).toMatchObject({
      isbndbApiKey: "isbn-key",
      naverClientId: "naver-id",
      naverClientSecret: "naver-secret",
      rakutenApplicationId: "rakuten-app",
      rakutenAccessKey: "rakuten-access"
    });
    expect(getAppSettings()).toMatchObject({
      isbndbApiKey: "isbn-key",
      naverClientId: "naver-id",
      naverClientSecret: "naver-secret",
      rakutenApplicationId: "rakuten-app",
      rakutenAccessKey: "rakuten-access"
    });
  });

  it("persists new vision provider settings", () => {
    const saved = saveAppSettings({
      visionProvider: "grok",
      grokApiKey: "xai-key",
      geminiApiKey: "gemini-key",
      claudeApiKey: "claude-key"
    });

    expect(saved).toMatchObject({
      visionProvider: "grok",
      grokApiKey: "xai-key",
      geminiApiKey: "gemini-key",
      claudeApiKey: "claude-key"
    });
    expect(saveAppSettings({ visionProvider: "gork" as never }).visionProvider).toBe("grok");
  });

  it("does not create duplicate books when confirming the same ISBN twice", () => {
    const imagePath = "/uploads/imports/test/books.jpg";
    const batch = createImportBatch([imagePath], `test-${randomUUID()}`);
    const items = replaceImportItems(batch.id, [
      {
        imagePath,
        books: [visionBook, visionBook]
      }
    ]);

    const first = confirmImportItem(items[0]!.id, candidate);
    const second = confirmImportItem(items[1]!.id, candidate);
    const repeated = confirmImportItem(items[0]!.id, candidate);
    const books = listBooks({ owned: true });

    expect(first.duplicate).toBe(false);
    expect(second.duplicate).toBe(true);
    expect(repeated.duplicate).toBe(false);
    expect(books).toHaveLength(1);
    expect(books[0]?.ownedCount).toBe(1);
  });

  it("does not write books when confirming a missing import item", () => {
    expect(() => confirmImportItem("missing-item", candidate)).toThrow("Import item not found.");
    expect(listBooks({ owned: true })).toHaveLength(0);
  });

  it("round trips owned books and copies through CSV without duplicate copies", () => {
    const imagePath = "/uploads/imports/test/csv.jpg";
    const batch = createImportBatch([imagePath], `test-${randomUUID()}`);
    const items = replaceImportItems(batch.id, [{ imagePath, books: [visionBook] }]);
    confirmImportItem(items[0]!.id, candidate, { location: "Living room", notes: "Signed" });

    const csv = serializeLibraryCsv(listLibraryExportRows());
    const parsed = parseLibraryCsv(csv);
    expect(parsed.errors).toHaveLength(0);
    expect(parsed.rows[0]).toMatchObject({
      title: "Slightly Out of Focus",
      authors: ["Robert Capa"],
      location: "Living room",
      notes: "Signed"
    });

    closeDbForTests();
    process.env.BOOK_STORE_DB_PATH = testDbPath();
    const firstImport = importLibraryRows(parsed.rows);
    const secondImport = importLibraryRows(parsed.rows);

    expect(firstImport).toMatchObject({ createdBooks: 1, createdCopies: 1, skippedCopies: 0 });
    expect(secondImport.createdBooks).toBe(0);
    expect(secondImport.createdCopies).toBe(0);
    expect(secondImport.skippedCopies).toBe(1);
    expect(listBooks({ owned: true })[0]?.ownedCount).toBe(1);
  });

  it("restores distinct identical copies when CSV copy ids differ", () => {
    const baseRow = {
      title: "Same Shelf Book",
      authors: ["Same Author"],
      publisher: "",
      publishedDate: "",
      isbn10: "",
      isbn13: "9780000000000",
      coverUrl: "",
      description: "",
      source: "csv",
      sourceId: "",
      location: "Shelf A",
      notes: "",
      acquiredAt: "2024-01-01T00:00:00.000Z",
      createdAt: "2024-01-01T00:00:00.000Z",
      updatedAt: "2024-01-01T00:00:00.000Z"
    };

    const firstImport = importLibraryRows([
      { ...baseRow, copyId: "copy-one" },
      { ...baseRow, copyId: "copy-two" }
    ]);
    const secondImport = importLibraryRows([
      { ...baseRow, copyId: "copy-one" },
      { ...baseRow, copyId: "copy-two" }
    ]);

    expect(firstImport.createdCopies).toBe(2);
    expect(secondImport.skippedCopies).toBe(2);
    expect(listBooks({ owned: true })[0]?.ownedCount).toBe(2);
  });

  it("neutralizes spreadsheet formulas in CSV exports without breaking imports", () => {
    const row: LibraryExportRow = {
      bookId: "book-formula",
      title: "=HYPERLINK(\"https://example.com\")",
      authors: ["+Author"],
      publisher: "",
      publishedDate: "",
      isbn10: "",
      isbn13: "",
      coverUrl: "",
      description: "@note",
      source: "manual",
      sourceId: "",
      normalizedKey: "formula::author",
      bookCreatedAt: "2024-01-01T00:00:00.000Z",
      bookUpdatedAt: "2024-01-01T00:00:00.000Z",
      copyId: "copy-formula",
      copyStatus: "owned",
      location: "-Shelf",
      notes: "=note",
      acquiredAt: "2024-01-01T00:00:00.000Z",
      copyCreatedAt: "2024-01-01T00:00:00.000Z"
    };

    const csv = serializeLibraryCsv([row]);
    expect(csv).toContain('"\t=HYPERLINK(""https://example.com"")"');
    expect(csv).toContain('"\t=note"');
    expect(parseLibraryCsv(csv).rows[0]).toMatchObject({
      title: "=HYPERLINK(\"https://example.com\")",
      authors: ["+Author"],
      location: "-Shelf",
      notes: "=note"
    });
  });

  it("migrates old databases without deleting data", () => {
    const filePath = testDbPath();
    const oldDb = new DatabaseSync(filePath);
    oldDb.exec(`
      CREATE TABLE books (
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
      CREATE TABLE copies (
        id TEXT PRIMARY KEY,
        book_id TEXT NOT NULL REFERENCES books(id) ON DELETE CASCADE,
        status TEXT NOT NULL DEFAULT 'owned',
        location TEXT NOT NULL DEFAULT '',
        notes TEXT NOT NULL DEFAULT '',
        acquired_at TEXT NOT NULL,
        created_at TEXT NOT NULL
      );
      CREATE TABLE import_batches (
        id TEXT PRIMARY KEY,
        status TEXT NOT NULL,
        image_paths TEXT NOT NULL DEFAULT '[]',
        image_count INTEGER NOT NULL DEFAULT 0,
        error_message TEXT NOT NULL DEFAULT '',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE TABLE import_items (
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
      CREATE TABLE settings (key TEXT PRIMARY KEY, value TEXT NOT NULL DEFAULT '', updated_at TEXT NOT NULL);
      INSERT INTO books (id, title, authors, normalized_key, created_at, updated_at)
      VALUES ('old-book', 'Old Book', '["Author"]', 'old book::author', '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z');
      INSERT INTO copies (id, book_id, status, acquired_at, created_at)
      VALUES ('old-copy', 'old-book', 'owned', '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z');
    `);
    oldDb.close();

    closeDbForTests();
    process.env.BOOK_STORE_DB_PATH = filePath;
    const db = getDb();
    const columns = db.prepare("PRAGMA table_info(import_items)").all() as Array<{ name: string }>;
    const version = db.prepare("PRAGMA user_version").get() as { user_version: number };

    expect(version.user_version).toBeGreaterThanOrEqual(2);
    expect(columns.map((column) => column.name)).toContain("lookup_attempts");
    expect(db.prepare("SELECT COUNT(*) AS count FROM import_batch_images").get()).toMatchObject({ count: 0 });
    expect(listBooks({ owned: true })[0]?.title).toBe("Old Book");
  });

  it("keeps descriptions and supports book updates and deletes", () => {
    const imagePath = "/uploads/imports/test/editable.jpg";
    const batch = createImportBatch([imagePath], `test-${randomUUID()}`);
    const items = replaceImportItems(batch.id, [
      {
        imagePath,
        books: [
          {
            ...visionBook,
            title: "Editable Local Book",
            isbn: "",
            spineText: "Editable Local Book"
          }
        ]
      }
    ]);
    const localCandidate: MetadataCandidate = {
      ...candidate,
      id: `manual-${randomUUID()}`,
      title: "Editable Local Book",
      authors: ["First Author"],
      publisher: "Original Publisher",
      isbn10: "",
      isbn13: "",
      description: "Original 簡介",
      source: "manual",
      sourceId: "manual"
    };

    const confirmed = confirmImportItem(items[0]!.id, localCandidate);
    expect(confirmed.book.description).toBe("Original 簡介");

    const updated = updateBook(confirmed.book.id, {
      title: "Edited Local Book",
      authors: ["Second Author"],
      publisher: "Edited Publisher",
      publishedDate: "2026",
      isbn10: "",
      isbn13: "9780000000000",
      coverUrl: "https://example.com/cover.jpg",
      description: "Edited 簡介"
    });

    expect(updated).toMatchObject({
      title: "Edited Local Book",
      authors: ["Second Author"],
      publisher: "Edited Publisher",
      publishedDate: "2026",
      isbn13: "9780000000000",
      coverUrl: "https://example.com/cover.jpg",
      description: "Edited 簡介"
    });
    expect(getBook(confirmed.book.id)?.description).toBe("Edited 簡介");
    expect(deleteBook(confirmed.book.id)).toBe(true);
    expect(getBook(confirmed.book.id)).toBeNull();
  });
});
