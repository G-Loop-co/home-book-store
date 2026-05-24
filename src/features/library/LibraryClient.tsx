"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BookOpen, CheckCircle2, Search, UploadCloud } from "lucide-react";
import type { Book } from "@/lib/types";

interface BooksResponse {
  books: Book[];
}

export function LibraryClient(): React.ReactElement {
  const [query, setQuery] = useState("");
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setLoading(true);
      fetch(`/api/books?owned=1&query=${encodeURIComponent(query)}`, { signal: controller.signal })
        .then(async (response) => {
          if (!response.ok) {
            throw new Error("藏書讀取失敗");
          }
          return (await response.json()) as BooksResponse;
        })
        .then((data) => {
          setBooks(data.books);
          setError("");
        })
        .catch((fetchError: unknown) => {
          if (fetchError instanceof DOMException && fetchError.name === "AbortError") {
            return;
          }
          setError(fetchError instanceof Error ? fetchError.message : "藏書讀取失敗");
        })
        .finally(() => setLoading(false));
    }, 180);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  return (
    <>
      <section className="page-head">
        <div>
          <p className="eyebrow">Library</p>
          <h1>家中藏書</h1>
        </div>
        <Link className="button primary" href="/import">
          <UploadCloud size={18} aria-hidden="true" />
          匯入照片
        </Link>
      </section>

      <section className="toolbar">
        <label className="input" aria-label="搜尋藏書">
          <Search size={16} aria-hidden="true" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="搜尋書名、作者、ISBN"
            style={{ width: "calc(100% - 28px)", border: 0, outline: 0, background: "transparent", marginLeft: 8 }}
          />
        </label>
        <span className="badge ok">
          <CheckCircle2 size={14} aria-hidden="true" />
          {books.length} 本
        </span>
      </section>

      {error ? <div className="notice error">{error}</div> : null}

      {loading ? (
        <div className="empty">載入中</div>
      ) : books.length === 0 ? (
        <div className="empty">未有藏書</div>
      ) : (
        <section className="grid">
          {books.map((book) => (
            <Link className="book-card" href={`/books/${book.id}`} key={book.id}>
              <div className="cover">
                {book.coverUrl ? (
                  <img src={book.coverUrl} alt={book.title} />
                ) : (
                  <div className="cover-placeholder">
                    <BookOpen size={24} aria-hidden="true" />
                  </div>
                )}
              </div>
              <div>
                <div className="book-title">{book.title}</div>
                <div className="book-meta">
                  <span>{book.authors.join(", ") || "作者未明"}</span>
                  <span>{[book.publisher, book.publishedDate].filter(Boolean).join(" · ") || "出版資料未明"}</span>
                  <span>{book.isbn13 || book.isbn10 || "ISBN 未明"}</span>
                </div>
                <div className="badge-row">
                  <span className="badge ok">
                    <CheckCircle2 size={13} aria-hidden="true" />
                    已擁有
                  </span>
                  {book.ownedCount > 1 ? <span className="badge">{book.ownedCount} 本副本</span> : null}
                </div>
              </div>
            </Link>
          ))}
        </section>
      )}
    </>
  );
}
