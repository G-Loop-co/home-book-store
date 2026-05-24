import { NextResponse } from "next/server";
import { listBooks } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<NextResponse> {
  const url = new URL(request.url);
  const query = url.searchParams.get("query") ?? "";
  const owned = url.searchParams.get("owned") === "1";
  const books = listBooks({ query, owned });
  return NextResponse.json({ books });
}
