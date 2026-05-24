import { NextResponse } from "next/server";
import {
  getImportBatch,
  getImportBatchDetail,
  markOwnedCandidates,
  replaceImportItems,
  setBatchStatus,
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
    } catch {
      updateImportItemCandidates(item.id, [], "needs_review");
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
    setBatchStatus(id, "analyzing");
    const imageBooks = [];
    for (const imagePath of batch.imagePaths) {
      const result = await analyzeBookshelfImage(imagePath);
      imageBooks.push({ imagePath, books: result.books });
    }

    const insertedItems = replaceImportItems(id, imageBooks);
    await lookupInsertedItems(insertedItems);
    const detail = getImportBatchDetail(id);
    return NextResponse.json(detail);
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
