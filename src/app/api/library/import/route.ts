import { NextResponse } from "next/server";
import { importLibraryRows } from "@/lib/db";
import { parseLibraryCsv } from "@/lib/library-portability/csv";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const maxCsvBytes = 10 * 1024 * 1024;
const maxCsvRows = 10000;

function jsonError(message: string, status: number, extra: Record<string, unknown> = {}): NextResponse {
  return NextResponse.json({ error: message, ...extra }, { status });
}

export async function POST(request: Request): Promise<NextResponse> {
  const formData = await request.formData().catch(() => null);
  const file = formData?.get("csv");

  if (!(file instanceof File) || file.size === 0) {
    return jsonError("No CSV file was uploaded.", 400);
  }

  if (file.size > maxCsvBytes) {
    return jsonError("CSV file is too large.", 413);
  }

  const parsed = parseLibraryCsv(await file.text());
  if (parsed.rows.length > maxCsvRows) {
    return jsonError("CSV file has too many rows.", 400);
  }
  if (parsed.rows.length === 0 && parsed.errors.length > 0) {
    return jsonError("CSV import failed validation.", 400, { summary: { ...parsed, rows: 0 } });
  }

  const summary = importLibraryRows(parsed.rows);
  summary.errors.push(...parsed.errors);
  return NextResponse.json({ summary });
}
