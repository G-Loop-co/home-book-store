import { getAppSettings } from "@/lib/db";
import { parseVisionJson } from "@/lib/vision/parser";
import { imageBase64, MissingVisionKeyError, visionPrompt, type JsonObject } from "@/lib/vision/shared";
import type { VisionResult } from "@/lib/types";

function extractGeminiText(response: JsonObject): string {
  const candidates = Array.isArray(response.candidates) ? response.candidates : [];
  const firstCandidate = candidates[0];
  if (!firstCandidate || typeof firstCandidate !== "object") {
    return "";
  }

  const content = (firstCandidate as JsonObject).content;
  if (!content || typeof content !== "object") {
    return "";
  }

  const parts = Array.isArray((content as JsonObject).parts) ? ((content as JsonObject).parts as unknown[]) : [];
  return parts
    .map((part) => {
      if (!part || typeof part !== "object") {
        return "";
      }
      const text = (part as JsonObject).text;
      return typeof text === "string" ? text : "";
    })
    .filter(Boolean)
    .join("\n");
}

export async function analyzeBookshelfImageWithGemini(imagePath: string): Promise<VisionResult> {
  const settings = getAppSettings();
  const apiKey = settings.geminiApiKey;
  if (!apiKey) {
    throw new MissingVisionKeyError("Gemini", "GEMINI_API_KEY");
  }

  const model = settings.geminiVisionModel || "gemini-2.0-flash";
  const image = await imageBase64(imagePath);
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`, {
    method: "POST",
    headers: {
      "content-type": "application/json"
    },
    body: JSON.stringify({
      contents: [
        {
          role: "user",
          parts: [
            { text: visionPrompt() },
            { inlineData: { mimeType: image.mimeType, data: image.data } }
          ]
        }
      ],
      generationConfig: {
        temperature: 0,
        maxOutputTokens: Number(settings.geminiMaxTokens || 2000),
        responseMimeType: "application/json"
      }
    }),
    signal: AbortSignal.timeout(60000)
  });

  const json = (await response.json()) as JsonObject;
  if (!response.ok) {
    const error = json.error && typeof json.error === "object" ? (json.error as JsonObject) : {};
    const message = typeof error.message === "string" ? error.message : `Gemini request failed: ${response.status}`;
    throw new Error(message);
  }

  const text = extractGeminiText(json);
  if (!text) {
    throw new Error("Gemini response did not include candidate text.");
  }

  return parseVisionJson(text);
}
