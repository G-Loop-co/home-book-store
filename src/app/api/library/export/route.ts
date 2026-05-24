import { NextResponse } from "next/server";
import { listLibraryExportRows } from "@/lib/db";
import { serializeLibraryCsv } from "@/lib/library-portability/csv";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  const csv = serializeLibraryCsv(listLibraryExportRows());
  const date = new Date().toISOString().slice(0, 10);

  return new NextResponse(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="home-book-store-library-${date}.csv"`
    }
  });
}
