"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BookOpen, CheckCircle2, Search, UploadCloud } from "lucide-react";
import { useI18n } from "@/features/i18n/I18nProvider";
import { useErrorToast } from "@/features/toast/ToastProvider";
import type { Book } from "@/lib/types";

interface BooksResponse {
  books: Book[];
}

export function LibraryClient(): React.ReactElement {
  const { t } = useI18n();
  const [query, setQuery] = useState("");
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useErrorToast(error);

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setLoading(true);
      fetch(`/api/books?owned=1&query=${encodeURIComponent(query)}`, { signal: controller.signal })
        .then(async (response) => {
          if (!response.ok) {
            throw new Error(t("libraryReadFailed"));
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
          setError(fetchError instanceof Error ? fetchError.message : t("libraryReadFailed"));
        })
        .finally(() => setLoading(false));
    }, 180);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [query, t]);

  return (
    <>
      <section className="page-head">
        <div>
          <p className="eyebrow">{t("libraryEyebrow")}</p>
          <h1>{t("libraryTitle")}</h1>
        </div>
        <div className="actions">
          <Link className="button primary" href="/import">
            <UploadCloud size={18} aria-hidden="true" />
            {t("importPhotos")}
          </Link>
        </div>
      </section>

      <section className="toolbar">
        <label className="input" aria-label={t("searchLibraryAria")}>
          <Search size={16} aria-hidden="true" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t("searchLibraryPlaceholder")}
            style={{ width: "calc(100% - 28px)", border: 0, outline: 0, background: "transparent", marginInlineStart: 8 }}
          />
        </label>
        <span className="badge ok">
          <CheckCircle2 size={14} aria-hidden="true" />
          {t("bookCount", { count: books.length })}
        </span>
      </section>

      {error ? <div className="notice error">{error}</div> : null}

      {loading ? (
        <div className="empty">{t("loading")}</div>
      ) : books.length === 0 ? (
        <div className="empty">{t("noBooks")}</div>
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
                  <span>{book.authors.join(", ") || t("authorUnknown")}</span>
                  <span>{[book.publisher, book.publishedDate].filter(Boolean).join(" · ") || t("publishUnknown")}</span>
                  <span>{book.isbn13 || book.isbn10 || t("isbnUnknown")}</span>
                </div>
                <div className="badge-row">
                  <span className="badge ok">
                    <CheckCircle2 size={13} aria-hidden="true" />
                    {t("owned")}
                  </span>
                  {book.ownedCount > 1 ? <span className="badge">{t("copyCount", { count: book.ownedCount })}</span> : null}
                </div>
              </div>
            </Link>
          ))}
        </section>
      )}
    </>
  );
}
