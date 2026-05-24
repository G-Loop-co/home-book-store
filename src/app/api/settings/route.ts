import { NextResponse } from "next/server";
import { z } from "zod";
import { getAppSettings, saveAppSettings } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const settingsSchema = z.object({
  uiLanguage: z.enum(["zh-Hant", "zh-Hans", "en", "ja", "ko", "es", "fr", "de", "pt", "ar", "hi"]).optional(),
  visionProvider: z.enum(["opencode-go", "openai", "grok", "gemini", "claude"]).optional(),
  visionApiKey: z.string().optional(),
  opencodeGoApiKey: z.string().optional(),
  opencodeGoBaseUrl: z.string().optional(),
  opencodeGoVisionModel: z.string().optional(),
  opencodeGoMaxTokens: z.string().optional(),
  openaiApiKey: z.string().optional(),
  openaiVisionModel: z.string().optional(),
  grokApiKey: z.string().optional(),
  grokBaseUrl: z.string().optional(),
  grokVisionModel: z.string().optional(),
  grokMaxTokens: z.string().optional(),
  geminiApiKey: z.string().optional(),
  geminiVisionModel: z.string().optional(),
  geminiMaxTokens: z.string().optional(),
  claudeApiKey: z.string().optional(),
  claudeVisionModel: z.string().optional(),
  claudeMaxTokens: z.string().optional(),
  googleBooksApiKey: z.string().optional(),
  isbndbApiKey: z.string().optional(),
  naverClientId: z.string().optional(),
  naverClientSecret: z.string().optional(),
  rakutenApplicationId: z.string().optional(),
  rakutenAccessKey: z.string().optional()
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
