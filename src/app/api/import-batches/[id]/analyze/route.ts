import { NextResponse } from "next/server";
import {
  ensureImportBatchImageRows,
  getImportBatch,
  getImportBatchDetail,
  markImportBatchImageAnalyzing,
  markImportBatchImageFailed,
  markImportBatchImageSucceeded,
  markImportItemLookupFailed,
  markOwnedCandidates,
  resumableImportBatchImages,
  setBatchStatus,
  upsertImportItemsForImage,
  updateImportItemCandidates
} from "@/lib/db";
import { lookupBookMetadata } from "@/lib/metadata/providers";
import { analyzeBookshelfImage, MissingVisionKeyError } from "@/lib/vision";
import type { ImportItem, VisionBook } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ id: string }>;
}

function itemVisionInput(item: ImportItem): VisionBook {
  return (
    item.aiExtractedJson ?? {
      title: "",
      author: "",
      publisher: "",
      language: "",
      spineText: item.spineText,
      isbn: "",
      bbox: item.bbox ?? { x: 0, y: 0, width: 1, height: 1 },
      confidence: item.confidence,
      notes: ""
    }
  );
}

async function lookupInsertedItems(items: ImportItem[]): Promise<void> {
  for (const item of items) {
    try {
      const candidates = markOwnedCandidates(await lookupBookMetadata(itemVisionInput(item)));
      updateImportItemCandidates(item.id, candidates, "needs_review");
    } catch (error) {
      markImportItemLookupFailed(item.id, error instanceof Error ? error.message : "Metadata lookup failed.");
    }
  }
}

export async function POST(_request: Request, { params }: RouteParams): Promise<NextResponse> {
  const { id } = await params;
  const batch = getImportBatch(id);
  if (!batch) {
    return NextResponse.json({ error: "Import batch not found." }, { status: 404 });
  }

  try {
    ensureImportBatchImageRows(id, batch.imagePaths);
    setBatchStatus(id, "analyzing");
    const targets = resumableImportBatchImages(id);
    const failures: string[] = [];

    for (const image of targets) {
      markImportBatchImageAnalyzing(id, image.imagePath);
      try {
        const result = await analyzeBookshelfImage(image.imagePath);
        const insertedItems = upsertImportItemsForImage(id, image.imagePath, result.books);
        markImportBatchImageSucceeded(id, image.imagePath);
        await lookupInsertedItems(insertedItems);
      } catch (error) {
        if (error instanceof MissingVisionKeyError) {
          setBatchStatus(id, "needs_key", error.message);
          return NextResponse.json({ error: error.message }, { status: 400 });
        }

        const message = error instanceof Error ? error.message : "Vision analysis failed.";
        markImportBatchImageFailed(id, image.imagePath, message);
        failures.push(message);
      }
    }

    if (failures.length > 0) {
      setBatchStatus(id, "needs_retry", failures[0]);
    } else {
      setBatchStatus(id, "needs_review");
    }

    const detail = getImportBatchDetail(id);
    return NextResponse.json(detail ? { ...detail, failures } : { failures });
  } catch (error) {
    if (error instanceof MissingVisionKeyError) {
      setBatchStatus(id, "needs_key", error.message);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    const message = error instanceof Error ? error.message : "Vision analysis failed.";
    setBatchStatus(id, "failed", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
