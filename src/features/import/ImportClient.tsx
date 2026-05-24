"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, ImagePlus, Loader2, Sparkles, Trash2 } from "lucide-react";
import type { ImportBatch } from "@/lib/types";

interface CreateBatchResponse {
  batch: ImportBatch;
  error?: string;
}

type WorkflowPhase = "idle" | "uploading" | "analyzing" | "complete" | "error";

export function ImportClient(): React.ReactElement {
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
      setError("只可加入圖片檔");
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
      setError("未選擇圖片");
      throw new Error("未選擇圖片");
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
      throw new Error(data.error || "上傳失敗");
    }
    setBatch(data.batch);
    return data.batch;
  }

  async function analyze(): Promise<void> {
    if (!batch && files.length === 0) {
      setError("未選擇圖片");
      return;
    }

    setBusy(true);
    setError("");
    setPhase(batch ? "analyzing" : "uploading");
    setProgress(batch ? 40 : 8);
    setProgressLabel(batch ? "準備送出 Vision 分析" : "先上傳圖片");

    let progressTimer: number | undefined;

    try {
      const activeBatch = batch ?? (await createBatch());
      setPhase("analyzing");
      setProgress(42);
      setProgressLabel("Vision 正在閱讀書脊");
      progressTimer = window.setInterval(() => {
        setProgress((current) => {
          if (current >= 68) {
            setProgressLabel("Cross-source 正在查資料");
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
        throw new Error(data.error || "Vision 分析失敗");
      }
      setPhase("complete");
      setProgress(100);
      setProgressLabel("分析完成，前往確認頁");
      router.push(`/review/${activeBatch.id}`);
    } catch (analyzeError) {
      setError(analyzeError instanceof Error ? analyzeError.message : "Vision 分析失敗");
      setPhase("error");
      setProgressLabel("Vision 分析失敗");
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
          <p className="eyebrow">Import</p>
          <h1>匯入書架照片</h1>
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
            <p>拖放書架圖片</p>
            <button className="button" type="button" onClick={() => inputRef.current?.click()}>
              選擇圖片
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
          <h2>圖片預覽</h2>
          <span className="badge">{files.length} 張 · {Math.ceil(totalSize / 1024)} KB</span>
        </div>

        <div className="preview-grid" aria-live="polite">
          {files.length === 0 ? (
            <div className="preview-empty">
              <ImagePlus size={24} aria-hidden="true" />
              <span>未選圖片</span>
            </div>
          ) : (
            files.map((file, index) => (
              <figure className="preview-item" key={fileKey(file)}>
                <img src={previewUrls[index]} alt={file.name} />
                <figcaption>
                  <span>{file.name}</span>
                  <small>{Math.ceil(file.size / 1024)} KB</small>
                </figcaption>
                <button className="icon-button preview-remove" type="button" onClick={() => removeFile(index)} title="移除圖片">
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
              aria-label="匯入進度"
            >
              <span style={{ width: `${progress}%` }} />
            </div>
          </div>
        ) : null}

        <div className="actions">
          <button className="button primary" type="button" onClick={analyze} disabled={busy || (files.length === 0 && !batch)} title="Vision 分析">
            {busy ? <Loader2 size={17} aria-hidden="true" /> : <Sparkles size={17} aria-hidden="true" />}
            {phase === "analyzing" ? "分析中" : "Vision 分析"}
          </button>
        </div>
      </section>
    </>
  );
}
