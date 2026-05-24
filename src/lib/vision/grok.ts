import { getAppSettings } from "@/lib/db";
import { parseVisionJson } from "@/lib/vision/parser";
import { imageDataUrl, MissingVisionKeyError, visionPrompt, type JsonObject } from "@/lib/vision/shared";
import type { VisionResult } from "@/lib/types";

function baseUrl(): string {
  return getAppSettings().grokBaseUrl.replace(/\/+$/, "") || "https://api.x.ai/v1";
}

function chatCompletionsUrl(): string {
  const url = baseUrl();
  return url.endsWith("/chat/completions") ? url : `${url}/chat/completions`;
}

function maxTokens(): number {
  return Number(getAppSettings().grokMaxTokens || 2000);
}

function extractChatText(response: JsonObject): string {
  const choices = Array.isArray(response.choices) ? response.choices : [];
  const firstChoice = choices[0];
  if (!firstChoice || typeof firstChoice !== "object") {
    return "";
  }

  const message = (firstChoice as JsonObject).message;
  if (!message || typeof message !== "object") {
    return "";
  }

  const content = (message as JsonObject).content;
  if (typeof content === "string") {
    return content;
  }

  if (!Array.isArray(content)) {
    return "";
  }

  return content
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

export async function analyzeBookshelfImageWithGrok(imagePath: string): Promise<VisionResult> {
  const settings = getAppSettings();
  const apiKey = settings.grokApiKey;
  if (!apiKey) {
    throw new MissingVisionKeyError("Grok", "GROK_API_KEY");
  }

  const dataUrl = await imageDataUrl(imagePath);
  const response = await fetch(chatCompletionsUrl(), {
    method: "POST",
    headers: {
      authorization: `Bearer ${apiKey}`,
      "content-type": "application/json"
    },
    body: JSON.stringify({
      model: settings.grokVisionModel || "grok-2-vision-1212",
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: visionPrompt() },
            { type: "image_url", image_url: { url: dataUrl, detail: "high" } }
          ]
        }
      ],
      temperature: 0,
      max_tokens: maxTokens(),
      response_format: { type: "json_object" }
    }),
    signal: AbortSignal.timeout(60000)
  });

  const json = (await response.json()) as JsonObject;
  if (!response.ok) {
    const error = json.error && typeof json.error === "object" ? (json.error as JsonObject) : {};
    const message = typeof error.message === "string" ? error.message : `Grok request failed: ${response.status}`;
    throw new Error(message);
  }

  const text = extractChatText(json);
  if (!text) {
    throw new Error("Grok response did not include message content.");
  }

  return parseVisionJson(text);
}
