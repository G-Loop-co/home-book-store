import { NextResponse } from "next/server";
import { z } from "zod";
import { getAppSettings, saveAppSettings } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const settingsSchema = z.object({
  uiLanguage: z.enum(["zh-Hant", "zh-Hans", "en", "ja", "ko", "es", "fr", "de", "pt", "ar", "hi"]).optional(),
  visionProvider: z.enum(["opencode-go", "openai"]).optional(),
  visionApiKey: z.string().optional(),
  opencodeGoApiKey: z.string().optional(),
  opencodeGoBaseUrl: z.string().optional(),
  opencodeGoVisionModel: z.string().optional(),
  opencodeGoMaxTokens: z.string().optional(),
  openaiApiKey: z.string().optional(),
  openaiVisionModel: z.string().optional(),
  googleBooksApiKey: z.string().optional()
});

export async function GET(): Promise<NextResponse> {
  return NextResponse.json({ settings: getAppSettings() });
}

export async function PUT(request: Request): Promise<NextResponse> {
  const body = settingsSchema.safeParse(await request.json());
  if (!body.success) {
    return NextResponse.json({ error: "Invalid settings payload.", issues: body.error.issues }, { status: 400 });
  }

  return NextResponse.json({ settings: saveAppSettings(body.data) });
}
