import { NextResponse } from "next/server";
import { z } from "zod";
import { deleteBook, getBook, updateBook } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ id: string }>;
}

const bookUpdateSchema = z.object({
  title: z.string().min(1),
  authors: z.array(z.string()).default([]),
  publisher: z.string().default(""),
  publishedDate: z.string().default(""),
  isbn10: z.string().default(""),
  isbn13: z.string().default(""),
  coverUrl: z.string().default(""),
  description: z.string().default("")
});

export async function GET(_request: Request, { params }: RouteParams): Promise<NextResponse> {
  const { id } = await params;
  const book = getBook(id);
  if (!book) {
    return NextResponse.json({ error: "Book not found." }, { status: 404 });
  }

  return NextResponse.json({ book });
}

export async function PATCH(request: Request, { params }: RouteParams): Promise<NextResponse> {
  const { id } = await params;
  const body = bookUpdateSchema.safeParse(await request.json().catch(() => ({})));
  if (!body.success) {
    return NextResponse.json({ error: "Invalid book payload.", issues: body.error.issues }, { status: 400 });
  }

  if (!getBook(id)) {
    return NextResponse.json({ error: "Book not found." }, { status: 404 });
  }

  const book = updateBook(id, body.data);
  return NextResponse.json({ book });
}

export async function DELETE(_request: Request, { params }: RouteParams): Promise<NextResponse> {
  const { id } = await params;
  if (!deleteBook(id)) {
    return NextResponse.json({ error: "Book not found." }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
