"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, BookOpen, CheckCircle2, Loader2, Pencil, Save, Trash2, X } from "lucide-react";
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
        setError(loadError instanceof Error ? loadError.message : "藏書讀取失敗");
      } finally {
        setLoading(false);
      }
    }

    void loadBook();
    return () => controller.abort();
  }, [bookId]);

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
      setError("書名不可留空");
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
      setError(saveError instanceof Error ? saveError.message : "藏書更新失敗");
    } finally {
      setSaving(false);
    }
  }

  async function deleteCurrentBook(): Promise<void> {
    if (!book || !window.confirm(`刪除「${book.title}」？`)) {
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
      setError(deleteError instanceof Error ? deleteError.message : "藏書刪除失敗");
      setDeleting(false);
    }
  }

  if (loading) {
    return <div className="empty">載入中</div>;
  }

  if (!book || !form) {
    return (
      <>
        <Link className="button" href="/">
          <ArrowLeft size={17} aria-hidden="true" />
          返回藏書
        </Link>
        <div className="empty">找不到藏書</div>
      </>
    );
  }

  return (
    <>
      <section className="page-head">
        <div>
          <p className="eyebrow">Book</p>
          <h1>{book.title}</h1>
        </div>
        <div className="actions">
          <Link className="button" href="/">
            <ArrowLeft size={17} aria-hidden="true" />
            返回
          </Link>
          {editing ? (
            <>
              <button className="button primary" type="button" onClick={save} disabled={saving}>
                {saving ? <Loader2 size={17} aria-hidden="true" /> : <Save size={17} aria-hidden="true" />}
                儲存
              </button>
              <button className="button" type="button" onClick={cancelEdit} disabled={saving}>
                <X size={17} aria-hidden="true" />
                取消
              </button>
            </>
          ) : (
            <button className="button" type="button" onClick={() => setEditing(true)}>
              <Pencil size={17} aria-hidden="true" />
              編輯
            </button>
          )}
          <button className="button danger" type="button" onClick={deleteCurrentBook} disabled={deleting || saving}>
            {deleting ? <Loader2 size={17} aria-hidden="true" /> : <Trash2 size={17} aria-hidden="true" />}
            刪除
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
                書名
                <input className="input full" value={form.title} onChange={(event) => update("title", event.target.value)} />
              </label>
              <label className="field">
                作者
                <input className="input full" value={form.authors} onChange={(event) => update("authors", event.target.value)} />
              </label>
              <label className="field">
                出版社
                <input className="input full" value={form.publisher} onChange={(event) => update("publisher", event.target.value)} />
              </label>
              <label className="field">
                出版日期
                <input className="input full" value={form.publishedDate} onChange={(event) => update("publishedDate", event.target.value)} />
              </label>
              <label className="field">
                ISBN-10
                <input className="input full" value={form.isbn10} onChange={(event) => update("isbn10", event.target.value)} />
              </label>
              <label className="field">
                ISBN-13
                <input className="input full" value={form.isbn13} onChange={(event) => update("isbn13", event.target.value)} />
              </label>
              <label className="field wide">
                封面 URL
                <input className="input full" value={form.coverUrl} onChange={(event) => update("coverUrl", event.target.value)} />
              </label>
              <label className="field wide">
                簡介
                <textarea className="input textarea full" value={form.description} onChange={(event) => update("description", event.target.value)} />
              </label>
            </div>
          ) : (
            <div className="detail-read">
              <div className="badge-row">
                <span className="badge ok">
                  <CheckCircle2 size={13} aria-hidden="true" />
                  已擁有
                </span>
                {book.ownedCount > 1 ? <span className="badge">{book.ownedCount} 本副本</span> : null}
              </div>
              <dl className="detail-list">
                <div>
                  <dt>作者</dt>
                  <dd>{book.authors.join(", ") || "作者未明"}</dd>
                </div>
                <div>
                  <dt>出版</dt>
                  <dd>{[book.publisher, book.publishedDate].filter(Boolean).join(" · ") || "出版資料未明"}</dd>
                </div>
                <div>
                  <dt>ISBN</dt>
                  <dd>{book.isbn13 || book.isbn10 || "ISBN 未明"}</dd>
                </div>
                <div>
                  <dt>來源</dt>
                  <dd>{book.source || "手動"}</dd>
                </div>
              </dl>
              <section className="description-block">
                <h2>簡介</h2>
                <p>{book.description || "未有簡介"}</p>
              </section>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
