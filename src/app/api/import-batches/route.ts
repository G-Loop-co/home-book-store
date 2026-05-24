import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { createImportBatch } from "@/lib/db";
import { saveUploadedImages } from "@/lib/uploads";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function jsonError(message: string, status: number): NextResponse {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const formData = await request.formData();
    const files = formData.getAll("images").filter((value): value is File => value instanceof File && value.size > 0);

    if (files.length === 0) {
      return jsonError("No image files were uploaded.", 400);
    }

    const batchId = randomUUID();
    const imagePaths = await saveUploadedImages(files, batchId);
    const batch = createImportBatch(imagePaths, batchId);
    return NextResponse.json({ batch });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Failed to create import batch.", 500);
  }
}
