"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  BookCheck,
  CheckCircle2,
  Loader2,
  RotateCw,
  Search,
  SkipForward,
  Sparkles
} from "lucide-react";
import type { CSSProperties } from "react";
import { useI18n } from "@/features/i18n/I18nProvider";
import { useErrorToast } from "@/features/toast/ToastProvider";
import type { ImportBatchDetail, ImportItem, MetadataCandidate } from "@/lib/types";

interface ReviewClientProps {
  batchId: string;
}

type EditField = "title" | "author" | "publisher" | "isbn" | "description";
type Edits = Record<string, Partial<Record<EditField, string>>>;
type BulkLookupState = {
  active: boolean;
  done: number;
  total: number;
  label: string;
  errors: number;
};

function statusLabel(status: ImportItem["status"], t: ReturnType<typeof useI18n>["t"]): string {
  const labels: Record<ImportItem["status"], string> = {
    pending_lookup: t("statusPendingLookup"),
    needs_review: t("statusNeedsReview"),
    confirmed: t("statusConfirmed"),
    duplicate: t("statusDuplicate"),
    rejected: t("statusRejected")
  };
  return labels[status];
}

function bboxStyle(item: ImportItem): CSSProperties {
  const bbox = item.bbox;
  if (!bbox) {
    return {};
  }

  return {
    left: `${bbox.x * 100}%`,
    top: `${bbox.y * 100}%`,
    width: `${bbox.width * 100}%`,
    height: `${bbox.height * 100}%`
  };
}

function splitAuthors(value: string): string[] {
  return value
    .split(/[,，、]/)
    .map((author) => author.trim())
    .filter(Boolean);
}

function isbnFields(value: string): Pick<MetadataCandidate, "isbn10" | "isbn13"> {
  const cleaned = value.replace(/[^0-9Xx]/g, "").toUpperCase();
  return {
    isbn10: cleaned.length === 10 ? cleaned : "",
    isbn13: cleaned.length === 13 ? cleaned : ""
  };
}

function candidateIsbn(candidate: MetadataCandidate): string {
  return candidate.isbn13 || candidate.isbn10;
}

function needsMetadataLookup(item: ImportItem): boolean {
  return item.status !== "confirmed" && item.status !== "duplicate" && item.status !== "rejected" && item.metadataCandidates.length === 0;
}

async function readJson<T>(response: Response): Promise<T> {
  const data = (await response.json()) as T & { error?: string };
  if (!response.ok) {
    throw new Error(data.error || "Request failed");
  }
  return data;
}

export function ReviewClient({ batchId }: ReviewClientProps): React.ReactElement {
  const { t } = useI18n();
  const [detail, setDetail] = useState<ImportBatchDetail | null>(null);
  const [edits, setEdits] = useState<Edits>({});
  const [selected, setSelected] = useState<Record<string, string>>({});
  const [busyItemId, setBusyItemId] = useState("");
  const [loading, setLoading] = useState(true);
  const [bulkLookup, setBulkLookup] = useState<BulkLookupState>({
    active: false,
    done: 0,
    total: 0,
    label: "",
    errors: 0
  });
  const [error, setError] = useState("");
  const autoLookupBatchRef = useRef("");
  useErrorToast(error);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/import-batches/${batchId}`);
      const data = await readJson<ImportBatchDetail>(response);
      setDetail(data);
    } catch (refreshError) {
      setError(refreshError instanceof Error ? refreshError.message : t("batchReadFailed"));
    } finally {
      setLoading(false);
    }
  }, [batchId, t]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const imageGroups = useMemo(() => {
    if (!detail) {
      return [];
    }
    return detail.batch.imagePaths.map((imagePath) => ({
      imagePath,
      items: detail.items.filter((item) => item.imagePath === imagePath)
    }));
  }, [detail]);

  const lookupableCount = useMemo(
    () => detail?.items.filter(needsMetadataLookup).length ?? 0,
    [detail]
  );

  useEffect(() => {
    if (!detail) {
      return;
    }

    setSelected((current) => {
      const next = { ...current };
      for (const item of detail.items) {
        const firstCandidate = item.metadataCandidates[0];
        if (firstCandidate && !next[item.id]) {
          next[item.id] = firstCandidate.id;
        }
      }
      return next;
    });

    setEdits((current) => {
      const next: Edits = { ...current };
      for (const item of detail.items) {
        const firstCandidate = item.metadataCandidates[0];
        if (firstCandidate && !next[item.id]) {
          next[item.id] = {
            title: firstCandidate.title,
            author: firstCandidate.authors.join(", "),
            publisher: firstCandidate.publisher,
            isbn: candidateIsbn(firstCandidate),
            description: firstCandidate.description
          };
        }
      }
      return next;
    });
  }, [detail]);

  function updateItem(updated: ImportItem): void {
    setDetail((current) => {
      if (!current) {
        return current;
      }
      return {
        ...current,
        items: current.items.map((item) => (item.id === updated.id ? updated : item))
      };
    });
  }

  function editValue(item: ImportItem, field: EditField): string {
    const edited = edits[item.id]?.[field];
    if (edited !== undefined) {
      return edited;
    }

    if (field === "title") {
      return item.aiExtractedJson?.title || item.spineText;
    }
    if (field === "author") {
      return item.aiExtractedJson?.author || "";
    }
    if (field === "publisher") {
      return item.aiExtractedJson?.publisher || "";
    }
    if (field === "description") {
      return item.metadataCandidates[0]?.description || "";
    }
    return item.aiExtractedJson?.isbn || "";
  }

  function setEdit(itemId: string, field: EditField, value: string): void {
    setEdits((current) => ({
      ...current,
      [itemId]: {
        ...current[itemId],
        [field]: value
      }
    }));
  }

  function applyCandidateToFields(itemId: string, candidate: MetadataCandidate): void {
    setEdits((current) => ({
      ...current,
      [itemId]: {
        ...current[itemId],
        title: candidate.title,
        author: candidate.authors.join(", "),
        publisher: candidate.publisher,
        isbn: candidateIsbn(candidate),
        description: candidate.description
      }
    }));
  }

  function selectCandidate(itemId: string, candidate: MetadataCandidate): void {
    setSelected((current) => ({ ...current, [itemId]: candidate.id }));
    applyCandidateToFields(itemId, candidate);
  }

  function manualCandidate(item: ImportItem): MetadataCandidate {
    const isbn = isbnFields(editValue(item, "isbn"));
    return {
      id: `manual-${item.id}`,
      title: editValue(item, "title").trim(),
      authors: splitAuthors(editValue(item, "author")),
      publisher: editValue(item, "publisher").trim(),
      publishedDate: "",
      ...isbn,
      coverUrl: "",
      description: editValue(item, "description").trim(),
      source: "manual",
      sourceId: item.id,
      score: 0
    };
  }

  function candidateWithEdits(item: ImportItem, candidate: MetadataCandidate): MetadataCandidate {
    const isbn = isbnFields(editValue(item, "isbn"));
    return {
      ...candidate,
      title: editValue(item, "title").trim(),
      authors: splitAuthors(editValue(item, "author")),
      publisher: editValue(item, "publisher").trim(),
      ...isbn,
      description: editValue(item, "description").trim()
    };
  }

  async function lookupItemMetadata(item: ImportItem): Promise<ImportItem> {
    const response = await fetch(`/api/import-items/${item.id}/lookup`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        title: editValue(item, "title"),
        author: editValue(item, "author"),
        publisher: editValue(item, "publisher"),
        isbn: editValue(item, "isbn")
      })
    });
    const data = await readJson<{ item: ImportItem }>(response);
    updateItem(data.item);
    const firstCandidate = data.item.metadataCandidates[0];
    if (firstCandidate) {
      setSelected((current) => ({ ...current, [item.id]: firstCandidate.id }));
      applyCandidateToFields(item.id, firstCandidate);
    }
    return data.item;
  }

  async function lookup(item: ImportItem): Promise<void> {
    setBusyItemId(item.id);
    setError("");
    try {
      await lookupItemMetadata(item);
    } catch (lookupError) {
      setError(lookupError instanceof Error ? lookupError.message : t("metadataLookupFailed"));
    } finally {
      setBusyItemId("");
    }
  }

  async function lookupMissingMetadata(items: ImportItem[] = detail?.items ?? [], automatic = false): Promise<void> {
    const targets = items.filter(needsMetadataLookup);
    if (targets.length === 0) {
      if (!automatic) {
        setBulkLookup({ active: false, done: 0, total: 0, label: t("noMetadataToLookup"), errors: 0 });
      }
      return;
    }

    if (!automatic) {
      setError("");
    }
    setBulkLookup({
      active: true,
      done: 0,
      total: targets.length,
      label: automatic ? t("autoLookup") : t("lookupAll"),
      errors: 0
    });

    let failures = 0;
    for (const [index, item] of targets.entries()) {
      const title = editValue(item, "title") || item.spineText || `#${index + 1}`;
      setBusyItemId(item.id);
      setBulkLookup((current) => ({
        ...current,
        done: index,
        label: t("crossSourceLookupBook", { title })
      }));

      try {
        await lookupItemMetadata(item);
      } catch {
        failures += 1;
      }

      setBulkLookup((current) => ({
        ...current,
        done: index + 1,
        errors: failures
      }));
    }

    setBusyItemId("");
    setBulkLookup({
      active: false,
      done: targets.length,
      total: targets.length,
      label: failures > 0 ? t("lookupFailures", { count: failures }) : t("lookupComplete"),
      errors: failures
    });
    if (failures > 0 && !automatic) {
      setError(t("lookupFailures", { count: failures }));
    }
  }

  useEffect(() => {
    if (!detail || loading || bulkLookup.active || lookupableCount === 0) {
      return;
    }
    if (autoLookupBatchRef.current === detail.batch.id) {
      return;
    }

    autoLookupBatchRef.current = detail.batch.id;
    void lookupMissingMetadata(detail.items, true);
  }, [detail, loading, bulkLookup.active, lookupableCount]);

  async function confirm(item: ImportItem): Promise<void> {
    const selectedId = selected[item.id] ?? item.metadataCandidates[0]?.id ?? `manual-${item.id}`;
    const baseCandidate =
      selectedId === `manual-${item.id}`
        ? manualCandidate(item)
        : item.metadataCandidates.find((entry) => entry.id === selectedId) ?? manualCandidate(item);
    const candidate = candidateWithEdits(item, baseCandidate);

    if (!candidate.title) {
      setError(t("titleRequired"));
      return;
    }

    setBusyItemId(item.id);
    setError("");
    try {
      const response = await fetch(`/api/import-items/${item.id}/confirm`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ candidate })
      });
      const data = await readJson<{ item: ImportItem }>(response);
      updateItem(data.item);
    } catch (confirmError) {
      setError(confirmError instanceof Error ? confirmError.message : t("importFailed"));
    } finally {
      setBusyItemId("");
    }
  }

  async function reject(item: ImportItem): Promise<void> {
    setBusyItemId(item.id);
    setError("");
    try {
      const response = await fetch(`/api/import-items/${item.id}/reject`, {
        method: "POST"
      });
      const data = await readJson<{ item: ImportItem }>(response);
      updateItem(data.item);
    } catch (rejectError) {
      setError(rejectError instanceof Error ? rejectError.message : t("rejectFailed"));
    } finally {
      setBusyItemId("");
    }
  }

  return (
    <>
      <section className="page-head">
        <div>
          <p className="eyebrow">{t("reviewEyebrow")}</p>
          <h1>{t("reviewTitle")}</h1>
        </div>
        <div className="actions">
          <button
            className="button"
            type="button"
            onClick={() => lookupMissingMetadata()}
            disabled={loading || bulkLookup.active || lookupableCount === 0}
            title={t("lookupAll")}
          >
            {bulkLookup.active ? <Loader2 size={17} aria-hidden="true" /> : <Search size={17} aria-hidden="true" />}
            {t("lookupAll")}
          </button>
          <button className="button" type="button" onClick={refresh} disabled={loading} title={t("refresh")}>
            <RotateCw size={17} aria-hidden="true" />
            {t("refresh")}
          </button>
          <Link className="button primary" href="/">
            <BookCheck size={17} aria-hidden="true" />
            {t("navLibrary")}
          </Link>
        </div>
      </section>

      {error ? (
        <div className="notice error">
          <AlertCircle size={18} aria-hidden="true" />
          <span>{error}</span>
        </div>
      ) : null}

      {bulkLookup.total > 0 ? (
        <div className={`progress-panel ${bulkLookup.errors > 0 ? "error" : ""}`} aria-live="polite">
          <div className="progress-copy">
            <span>{bulkLookup.label}</span>
            <span>
              {bulkLookup.done}/{bulkLookup.total}
            </span>
          </div>
          <div
            className="progress-track"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round((bulkLookup.done / bulkLookup.total) * 100)}
            aria-label={t("lookupProgressAria")}
          >
            <span style={{ width: `${(bulkLookup.done / bulkLookup.total) * 100}%` }} />
          </div>
        </div>
      ) : null}

      {loading || !detail ? (
        <div className="empty">{t("loading")}</div>
      ) : detail.items.length === 0 ? (
        <div className="empty">{t("noSpines")}</div>
      ) : (
        <section className="review-layout">
          <div className="image-stack">
            {imageGroups.map((group) => (
              <article className="image-panel" key={group.imagePath}>
                <div className="image-frame">
                  <img src={group.imagePath} alt={t("bookshelfPhotoAlt")} />
                  {group.items.map((item) =>
                    item.bbox ? (
                      <span
                        className={`bbox ${item.status === "confirmed" || item.status === "duplicate" ? "confirmed" : ""}`}
                        key={item.id}
                        style={bboxStyle(item)}
                      />
                    ) : null
                  )}
                </div>
              </article>
            ))}
          </div>

          <div className="review-list">
            {detail.items.map((item, index) => (
              <article className="review-card" key={item.id}>
                <div className="review-card-head">
                  <div>
                    <h2>#{index + 1} {editValue(item, "title") || item.spineText || t("unnamed")}</h2>
                    <div className="badge-row">
                      <span className={item.status === "duplicate" ? "badge ok" : "badge"}>{statusLabel(item.status, t)}</span>
                      <span className="badge">
                        <Sparkles size={13} aria-hidden="true" />
                        {Math.round(item.confidence * 100)}%
                      </span>
                    </div>
                  </div>
                </div>

                <div className="field-grid">
                  <input
                    className="input full"
                    value={editValue(item, "title")}
                    onChange={(event) => setEdit(item.id, "title", event.target.value)}
                    placeholder={t("titleField")}
                  />
                  <input
                    className="input full"
                    value={editValue(item, "author")}
                    onChange={(event) => setEdit(item.id, "author", event.target.value)}
                    placeholder={t("authorField")}
                  />
                  <input
                    className="input full"
                    value={editValue(item, "publisher")}
                    onChange={(event) => setEdit(item.id, "publisher", event.target.value)}
                    placeholder={t("publisherField")}
                  />
                  <input
                    className="input full"
                    value={editValue(item, "isbn")}
                    onChange={(event) => setEdit(item.id, "isbn", event.target.value)}
                    placeholder={t("isbnField")}
                  />
                  <textarea
                    className="input textarea full wide"
                    value={editValue(item, "description")}
                    onChange={(event) => setEdit(item.id, "description", event.target.value)}
                    placeholder={t("descriptionField")}
                  />
                </div>

                <div className="candidate-list">
                  <label className="candidate-row">
                    <input
                      type="radio"
                      name={`candidate-${item.id}`}
                      checked={(selected[item.id] ?? `manual-${item.id}`) === `manual-${item.id}`}
                      onChange={() => setSelected((current) => ({ ...current, [item.id]: `manual-${item.id}` }))}
                    />
                    <span className="candidate-main">
                      <span className="candidate-title">{t("useManualFields")}</span>
                      <br />
                      <span className="muted">{manualCandidate(item).authors.join(", ") || t("authorUnknown")}</span>
                    </span>
                  </label>

                  {item.metadataCandidates.map((candidate) => (
                    <label className="candidate-row" key={candidate.id}>
                      <input
                        type="radio"
                        name={`candidate-${item.id}`}
                        checked={(selected[item.id] ?? item.metadataCandidates[0]?.id) === candidate.id}
                        onChange={() => selectCandidate(item.id, candidate)}
                      />
                      <span className="candidate-main">
                        <span className="candidate-title">{candidate.title}</span>
                        <br />
                        <span className="muted">
                          {[candidate.authors.join(", "), candidate.publisher, candidate.publishedDate, candidateIsbn(candidate), candidate.source]
                            .filter(Boolean)
                            .join(" · ")}
                        </span>
                        {candidate.description ? <span className="candidate-description">{candidate.description}</span> : null}
                        <span className="badge-row">
                          <span className="badge">{Math.round(candidate.score * 100)}%</span>
                          {candidate.ownedBookId ? (
                            <span className="badge ok">
                              <CheckCircle2 size={13} aria-hidden="true" />
                              {t("owned")}
                            </span>
                          ) : null}
                        </span>
                      </span>
                    </label>
                  ))}
                </div>

                <div className="actions">
                  <button className="button" type="button" onClick={() => lookup(item)} disabled={bulkLookup.active || busyItemId === item.id} title={t("lookupMetadata")}>
                    {busyItemId === item.id ? <Loader2 size={17} aria-hidden="true" /> : <Search size={17} aria-hidden="true" />}
                    {t("lookupMetadata")}
                  </button>
                  <button
                    className="button primary"
                    type="button"
                    onClick={() => confirm(item)}
                    disabled={bulkLookup.active || busyItemId === item.id || item.status === "confirmed" || item.status === "duplicate"}
                    title={t("importBook")}
                  >
                    <BookCheck size={17} aria-hidden="true" />
                    {t("importBook")}
                  </button>
                  <button
                    className="button warn"
                    type="button"
                    onClick={() => reject(item)}
                    disabled={bulkLookup.active || busyItemId === item.id || item.status === "rejected"}
                    title={t("skip")}
                  >
                    <SkipForward size={17} aria-hidden="true" />
                    {t("skip")}
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}
    </>
  );
}
