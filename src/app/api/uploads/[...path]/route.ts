import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { uploadDirectory } from "@/lib/runtime-paths";
import { mimeTypeForPath } from "@/lib/vision/shared";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ path: string[] }>;
}

export async function GET(_request: Request, { params }: RouteParams): Promise<NextResponse> {
  const { path: segments } = await params;
  const root = uploadDirectory();
  const filePath = path.join(/*turbopackIgnore: true*/ root, ...segments);
  const relative = path.relative(root, filePath);

  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    return NextResponse.json({ error: "Invalid upload path." }, { status: 400 });
  }

  try {
    const file = await readFile(/*turbopackIgnore: true*/ filePath);
    return new NextResponse(file, {
      headers: {
        "content-type": mimeTypeForPath(filePath),
        "cache-control": "private, max-age=3600"
      }
    });
  } catch {
    return NextResponse.json({ error: "Upload not found." }, { status: 404 });
  }
}
