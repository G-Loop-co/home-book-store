import { NextResponse } from "next/server";
import { z } from "zod";
import { confirmImportItem } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ id: string }>;
}

const candidateSchema = z.object({
  id: z.string().default("manual"),
  title: z.string().min(1),
  authors: z.array(z.string()).default([]),
  publisher: z.string().default(""),
  publishedDate: z.string().default(""),
  isbn10: z.string().default(""),
  isbn13: z.string().default(""),
  coverUrl: z.string().default(""),
  description: z.string().default(""),
  source: z
    .enum([
      "open_library",
      "google_books",
      "isbn_db",
      "naver_books",
      "rakuten_books",
      "library_of_congress",
      "isbn_tw",
      "kingstone",
      "hkbookcentre",
      "douban",
      "openbd",
      "bnf",
      "dnb",
      "internet_archive",
      "manual"
    ])
    .default("manual"),
  sourceId: z.string().default(""),
  score: z.number().min(0).max(1).default(0)
});

const confirmSchema = z.object({
  candidate: candidateSchema,
  location: z.string().optional(),
  notes: z.string().optional()
});

export async function POST(request: Request, { params }: RouteParams): Promise<NextResponse> {
  const { id } = await params;
  const body = confirmSchema.safeParse(await request.json());
  if (!body.success) {
    return NextResponse.json({ error: "Invalid confirm payload.", issues: body.error.issues }, { status: 400 });
  }

  try {
    const result = confirmImportItem(id, body.data.candidate, {
      location: body.data.location,
      notes: body.data.notes
    });
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to confirm import item." },
      { status: 500 }
    );
  }
}
