import { NextResponse } from "next/server";
import { getImportBatchDetail } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, { params }: RouteParams): Promise<NextResponse> {
  const { id } = await params;
  const detail = getImportBatchDetail(id);
  if (!detail) {
    return NextResponse.json({ error: "Import batch not found." }, { status: 404 });
  }

  return NextResponse.json(detail);
}
