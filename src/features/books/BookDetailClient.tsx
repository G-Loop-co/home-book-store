"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, BookOpen, CheckCircle2, Loader2, Pencil, Save, Trash2, X } from "lucide-react";
import { useI18n } from "@/features/i18n/I18nProvider";
import type { Book } from "@/lib/types";

interface BookDetailClientProps {
  bookId: string;
}

interface BookResponse {
  book: Book;
}

interface BookForm {
  title: string;
  authors: string;
  publisher: string;
  publishedDate: string;
  isbn10: string;
  isbn13: string;
  coverUrl: string;
  description: string;
}

function formFromBook(book: Book): BookForm {
  return {
    title: book.title,
    authors: book.authors.join(", "),
    publisher: book.publisher,
    publishedDate: book.publishedDate,
    isbn10: book.isbn10,
    isbn13: book.isbn13,
    coverUrl: book.coverUrl,
    description: book.description
  };
}

function splitAuthors(value: string): string[] {
  return value
    .split(/[,，、]/)
    .map((author) => author.trim())
    .filter(Boolean);
}

async function readJson<T>(response: Response): Promise<T> {
  const data = (await response.json()) as T & { error?: string };
  if (!response.ok) {
    throw new Error(data.error || "Request failed");
  }
  return data;
}

export function BookDetailClient({ bookId }: BookDetailClientProps): React.ReactElement {
  const { t } = useI18n();
  const router = useRouter();
  const [book, setBook] = useState<Book | null>(null);
  const [form, setForm] = useState<BookForm | null>(null);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    async function loadBook(): Promise<void> {
      setLoading(true);
      setError("");
      try {
        const response = await fetch(`/api/books/${bookId}`, { signal: controller.signal });
        const data = await readJson<BookResponse>(response);
        setBook(data.book);
        setForm(formFromBook(data.book));
      } catch (loadError) {
        if (loadError instanceof DOMException && loadError.name === "AbortError") {
          return;
        }
        setError(loadError instanceof Error ? loadError.message : t("bookReadFailed"));
      } finally {
        setLoading(false);
      }
    }

    void loadBook();
    return () => controller.abort();
  }, [bookId, t]);

  function update(field: keyof BookForm, value: string): void {
    setForm((current) => (current ? { ...current, [field]: value } : current));
  }

  function cancelEdit(): void {
    if (book) {
      setForm(formFromBook(book));
    }
    setEditing(false);
    setError("");
  }

  async function save(): Promise<void> {
    if (!form) {
      return;
    }
    if (!form.title.trim()) {
      setError(t("bookTitleRequired"));
      return;
    }

    setSaving(true);
    setError("");
    try {
      const response = await fetch(`/api/books/${bookId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title: form.title,
          authors: splitAuthors(form.authors),
          publisher: form.publisher,
          publishedDate: form.publishedDate,
          isbn10: form.isbn10,
          isbn13: form.isbn13,
          coverUrl: form.coverUrl,
          description: form.description
        })
      });
      const data = await readJson<BookResponse>(response);
      setBook(data.book);
      setForm(formFromBook(data.book));
      setEditing(false);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : t("bookUpdateFailed"));
    } finally {
      setSaving(false);
    }
  }

  async function deleteCurrentBook(): Promise<void> {
    if (!book || !window.confirm(t("deleteConfirm", { title: book.title }))) {
      return;
    }

    setDeleting(true);
    setError("");
    try {
      const response = await fetch(`/api/books/${book.id}`, { method: "DELETE" });
      await readJson<{ ok: boolean }>(response);
      router.push("/");
      router.refresh();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : t("bookDeleteFailed"));
      setDeleting(false);
    }
  }

  if (loading) {
    return <div className="empty">{t("loading")}</div>;
  }

  if (!book || !form) {
    return (
      <>
        <Link className="button" href="/">
          <ArrowLeft size={17} aria-hidden="true" />
          {t("backToLibrary")}
        </Link>
        <div className="empty">{t("bookNotFound")}</div>
      </>
    );
  }

  return (
    <>
      <section className="page-head">
        <div>
          <p className="eyebrow">{t("bookEyebrow")}</p>
          <h1>{book.title}</h1>
        </div>
        <div className="actions">
          <Link className="button" href="/">
            <ArrowLeft size={17} aria-hidden="true" />
            {t("back")}
          </Link>
          {editing ? (
            <>
              <button className="button primary" type="button" onClick={save} disabled={saving}>
                {saving ? <Loader2 size={17} aria-hidden="true" /> : <Save size={17} aria-hidden="true" />}
                {t("save")}
              </button>
              <button className="button" type="button" onClick={cancelEdit} disabled={saving}>
                <X size={17} aria-hidden="true" />
                {t("cancel")}
              </button>
            </>
          ) : (
            <button className="button" type="button" onClick={() => setEditing(true)}>
              <Pencil size={17} aria-hidden="true" />
              {t("edit")}
            </button>
          )}
          <button className="button danger" type="button" onClick={deleteCurrentBook} disabled={deleting || saving}>
            {deleting ? <Loader2 size={17} aria-hidden="true" /> : <Trash2 size={17} aria-hidden="true" />}
            {t("delete")}
          </button>
        </div>
      </section>

      {error ? <div className="notice error">{error}</div> : null}

      <section className="book-detail">
        <div className="detail-cover">
          {book.coverUrl ? (
            <img src={book.coverUrl} alt={book.title} />
          ) : (
            <div className="cover-placeholder">
              <BookOpen size={34} aria-hidden="true" />
            </div>
          )}
        </div>

        <div className="detail-panel">
          {editing ? (
            <div className="detail-form">
              <label className="field">
                {t("fieldTitle")}
                <input className="input full" value={form.title} onChange={(event) => update("title", event.target.value)} />
              </label>
              <label className="field">
                {t("fieldAuthors")}
                <input className="input full" value={form.authors} onChange={(event) => update("authors", event.target.value)} />
              </label>
              <label className="field">
                {t("fieldPublisher")}
                <input className="input full" value={form.publisher} onChange={(event) => update("publisher", event.target.value)} />
              </label>
              <label className="field">
                {t("fieldPublishedDate")}
                <input className="input full" value={form.publishedDate} onChange={(event) => update("publishedDate", event.target.value)} />
              </label>
              <label className="field">
                {t("fieldIsbn10")}
                <input className="input full" value={form.isbn10} onChange={(event) => update("isbn10", event.target.value)} />
              </label>
              <label className="field">
                {t("fieldIsbn13")}
                <input className="input full" value={form.isbn13} onChange={(event) => update("isbn13", event.target.value)} />
              </label>
              <label className="field wide">
                {t("fieldCoverUrl")}
                <input className="input full" value={form.coverUrl} onChange={(event) => update("coverUrl", event.target.value)} />
              </label>
              <label className="field wide">
                {t("fieldDescription")}
                <textarea className="input textarea full" value={form.description} onChange={(event) => update("description", event.target.value)} />
              </label>
            </div>
          ) : (
            <div className="detail-read">
              <div className="badge-row">
                <span className="badge ok">
                  <CheckCircle2 size={13} aria-hidden="true" />
                  {t("owned")}
                </span>
                {book.ownedCount > 1 ? <span className="badge">{t("copyCount", { count: book.ownedCount })}</span> : null}
              </div>
              <dl className="detail-list">
                <div>
                  <dt>{t("authorsLabel")}</dt>
                  <dd>{book.authors.join(", ") || t("authorUnknown")}</dd>
                </div>
                <div>
                  <dt>{t("publishingLabel")}</dt>
                  <dd>{[book.publisher, book.publishedDate].filter(Boolean).join(" · ") || t("publishUnknown")}</dd>
                </div>
                <div>
                  <dt>{t("isbnLabel")}</dt>
                  <dd>{book.isbn13 || book.isbn10 || t("isbnUnknown")}</dd>
                </div>
                <div>
                  <dt>{t("sourceLabel")}</dt>
                  <dd>{book.source || t("manualSource")}</dd>
                </div>
              </dl>
              <section className="description-block">
                <h2>{t("descriptionHeading")}</h2>
                <p>{book.description || t("noDescription")}</p>
              </section>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
