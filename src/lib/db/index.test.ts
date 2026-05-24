import { randomUUID } from "node:crypto";
import { beforeAll, describe, expect, it } from "vitest";
import { confirmImportItem, createImportBatch, deleteBook, getBook, listBooks, replaceImportItems, updateBook } from "@/lib/db";
import type { MetadataCandidate, VisionBook } from "@/lib/types";

beforeAll(() => {
  process.env.BOOK_STORE_DB_PATH = `.data/test-${randomUUID()}.sqlite`;
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
    const books = listBooks({ owned: true });

    expect(first.duplicate).toBe(false);
    expect(second.duplicate).toBe(true);
    expect(books).toHaveLength(1);
    expect(books[0]?.ownedCount).toBe(1);
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
