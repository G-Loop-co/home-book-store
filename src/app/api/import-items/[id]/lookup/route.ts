import { NextResponse } from "next/server";
import { getImportItem, markImportItemLookupFailed, markOwnedCandidates, updateImportItemCandidates } from "@/lib/db";
import { lookupBookMetadata } from "@/lib/metadata/providers";
import type { VisionBook } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ id: string }>;
}

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

export async function POST(request: Request, { params }: RouteParams): Promise<NextResponse> {
  const { id } = await params;
  const item = getImportItem(id);
  if (!item) {
    return NextResponse.json({ error: "Import item not found." }, { status: 404 });
  }

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const base: VisionBook = item.aiExtractedJson ?? {
    title: "",
    author: "",
    publisher: "",
    language: "",
    spineText: item.spineText,
    isbn: "",
    bbox: item.bbox ?? { x: 0, y: 0, width: 1, height: 1 },
    confidence: item.confidence,
    notes: ""
  };
  const input: VisionBook = {
    ...base,
    title: asString(body.title) || base.title,
    author: asString(body.author) || base.author,
    publisher: asString(body.publisher) || base.publisher,
    isbn: asString(body.isbn) || base.isbn
  };

  try {
    const candidates = markOwnedCandidates(await lookupBookMetadata(input));
    const updated = updateImportItemCandidates(id, candidates, "needs_review");
    return NextResponse.json({ item: updated });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Metadata lookup failed.";
    const updated = markImportItemLookupFailed(id, message);
    return NextResponse.json(
      { error: message, item: updated },
      { status: 500 }
    );
  }
}
