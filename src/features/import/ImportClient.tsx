"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, ImagePlus, Loader2, Sparkles, Trash2 } from "lucide-react";
import { useI18n } from "@/features/i18n/I18nProvider";
import type { ImportBatch } from "@/lib/types";

interface CreateBatchResponse {
  batch: ImportBatch;
  error?: string;
}

type WorkflowPhase = "idle" | "uploading" | "analyzing" | "complete" | "error";

export function ImportClient(): React.ReactElement {
  const { t } = useI18n();
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [batch, setBatch] = useState<ImportBatch | null>(null);
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [phase, setPhase] = useState<WorkflowPhase>("idle");
  const [progress, setProgress] = useState(0);
  const [progressLabel, setProgressLabel] = useState("");
  const [error, setError] = useState("");

  const totalSize = useMemo(() => files.reduce((total, file) => total + file.size, 0), [files]);

  useEffect(() => {
    const urls = files.map((file) => URL.createObjectURL(file));
    setPreviewUrls(urls);

    return () => {
      for (const url of urls) {
        URL.revokeObjectURL(url);
      }
    };
  }, [files]);

  function fileKey(file: File): string {
    return `${file.name}-${file.size}-${file.lastModified}`;
  }

  function acceptFiles(nextFiles: File[]): void {
    const images = nextFiles.filter((file) => file.type.startsWith("image/"));
    if (images.length !== nextFiles.length) {
      setError(t("imagesOnlyError"));
    } else {
      setError("");
    }

    setFiles((current) => {
      const byKey = new Map(current.map((file) => [fileKey(file), file]));
      for (const file of images) {
        byKey.set(fileKey(file), file);
      }
      return Array.from(byKey.values());
    });
    setBatch(null);
    setPhase("idle");
    setProgress(0);
    setProgressLabel("");
  }

  function onFilesChange(fileList: FileList | null): void {
    acceptFiles(fileList ? Array.from(fileList) : []);
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  }

  function removeFile(index: number): void {
    setFiles((current) => current.filter((_file, fileIndex) => fileIndex !== index));
    setBatch(null);
    setPhase("idle");
    setProgress(0);
    setProgressLabel("");
    setError("");
  }

  function onDragOver(event: React.DragEvent<HTMLDivElement>): void {
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
    setDragging(true);
  }

  function onDragLeave(event: React.DragEvent<HTMLDivElement>): void {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
      setDragging(false);
    }
  }

  function onDrop(event: React.DragEvent<HTMLDivElement>): void {
    event.preventDefault();
    setDragging(false);
    acceptFiles(Array.from(event.dataTransfer.files));
  }

  async function createBatch(): Promise<ImportBatch> {
    if (files.length === 0) {
      setError(t("noImagesSelected"));
      throw new Error(t("noImagesSelected"));
    }

    const formData = new FormData();
    for (const file of files) {
      formData.append("images", file);
    }

    const response = await fetch("/api/import-batches", {
      method: "POST",
      body: formData
    });
    const data = (await response.json()) as CreateBatchResponse;
    if (!response.ok) {
      throw new Error(data.error || t("uploadFailed"));
    }
    setBatch(data.batch);
    return data.batch;
  }

  async function analyze(): Promise<void> {
    if (!batch && files.length === 0) {
      setError(t("noImagesSelected"));
      return;
    }

    setBusy(true);
    setError("");
    setPhase(batch ? "analyzing" : "uploading");
    setProgress(batch ? 40 : 8);
    setProgressLabel(batch ? t("prepareVision") : t("uploadImagesFirst"));

    let progressTimer: number | undefined;

    try {
      const activeBatch = batch ?? (await createBatch());
      setPhase("analyzing");
      setProgress(42);
      setProgressLabel(t("visionReading"));
      progressTimer = window.setInterval(() => {
        setProgress((current) => {
          if (current >= 68) {
            setProgressLabel(t("crossSourceLookup"));
          }
          if (current < 68) {
            return current + 4;
          }
          if (current < 88) {
            return current + 2;
          }
          return Math.min(current + 0.5, 94);
        });
      }, 900);

      const response = await fetch(`/api/import-batches/${activeBatch.id}/analyze`, {
        method: "POST"
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(data.error || t("visionFailed"));
      }
      setPhase("complete");
      setProgress(100);
      setProgressLabel(t("analysisComplete"));
      router.push(`/review/${activeBatch.id}`);
    } catch (analyzeError) {
      setError(analyzeError instanceof Error ? analyzeError.message : t("visionFailed"));
      setPhase("error");
      setProgressLabel(t("visionFailed"));
    } finally {
      if (progressTimer !== undefined) {
        window.clearInterval(progressTimer);
      }
      setBusy(false);
    }
  }

  return (
    <>
      <section className="page-head">
        <div>
          <p className="eyebrow">{t("importEyebrow")}</p>
          <h1>{t("importTitle")}</h1>
        </div>
      </section>

      {error ? (
        <div className="notice error">
          <AlertCircle size={18} aria-hidden="true" />
          <span>{error}</span>
        </div>
      ) : null}

      <section className="upload-panel">
        <div
          className={`dropzone ${dragging ? "dragging" : ""}`}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
        >
          <div className="dropzone-content">
            <ImagePlus size={36} aria-hidden="true" />
            <p>{t("dropImages")}</p>
            <button className="button" type="button" onClick={() => inputRef.current?.click()}>
              {t("chooseImages")}
            </button>
            <input
              ref={inputRef}
              className="file-input"
              type="file"
              accept="image/*"
              multiple
              onChange={(event) => onFilesChange(event.target.files)}
            />
          </div>
        </div>

        <div className="preview-head">
          <h2>{t("previewTitle")}</h2>
          <span className="badge">{t("selectedImagesStats", { count: files.length, kb: Math.ceil(totalSize / 1024) })}</span>
        </div>

        <div className="preview-grid" aria-live="polite">
          {files.length === 0 ? (
            <div className="preview-empty">
              <ImagePlus size={24} aria-hidden="true" />
              <span>{t("noImages")}</span>
            </div>
          ) : (
            files.map((file, index) => (
              <figure className="preview-item" key={fileKey(file)}>
                <img src={previewUrls[index]} alt={file.name} />
                <figcaption>
                  <span>{file.name}</span>
                  <small>{Math.ceil(file.size / 1024)} KB</small>
                </figcaption>
                <button className="icon-button preview-remove" type="button" onClick={() => removeFile(index)} title={t("removeImage")}>
                  <Trash2 size={16} aria-hidden="true" />
                </button>
              </figure>
            ))
          )}
        </div>

        {phase !== "idle" ? (
          <div className={`progress-panel ${phase === "error" ? "error" : ""}`} aria-live="polite">
            <div className="progress-copy">
              <span>{progressLabel}</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <div
              className="progress-track"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(progress)}
              aria-label={t("importProgressAria")}
            >
              <span style={{ width: `${progress}%` }} />
            </div>
          </div>
        ) : null}

        <div className="actions">
          <button className="button primary" type="button" onClick={analyze} disabled={busy || (files.length === 0 && !batch)} title={t("visionAnalyze")}>
            {busy ? <Loader2 size={17} aria-hidden="true" /> : <Sparkles size={17} aria-hidden="true" />}
            {phase === "analyzing" ? t("analyzing") : t("visionAnalyze")}
          </button>
        </div>
      </section>
    </>
  );
}
