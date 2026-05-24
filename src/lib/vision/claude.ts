import { getAppSettings } from "@/lib/db";
import { parseVisionJson } from "@/lib/vision/parser";
import { imageBase64, MissingVisionKeyError, visionPrompt, type JsonObject } from "@/lib/vision/shared";
import type { VisionResult } from "@/lib/types";

function extractClaudeText(response: JsonObject): string {
  const content = Array.isArray(response.content) ? response.content : [];
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

export async function analyzeBookshelfImageWithClaude(imagePath: string): Promise<VisionResult> {
  const settings = getAppSettings();
  const apiKey = settings.claudeApiKey;
  if (!apiKey) {
    throw new MissingVisionKeyError("Claude", "CLAUDE_API_KEY");
  }

  const image = await imageBase64(imagePath);
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json"
    },
    body: JSON.stringify({
      model: settings.claudeVisionModel || "claude-3-5-sonnet-latest",
      max_tokens: Number(settings.claudeMaxTokens || 2000),
      temperature: 0,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: visionPrompt() },
            {
              type: "image",
              source: {
                type: "base64",
                media_type: image.mimeType,
                data: image.data
              }
            }
          ]
        }
      ]
    }),
    signal: AbortSignal.timeout(60000)
  });

  const json = (await response.json()) as JsonObject;
  if (!response.ok) {
    const error = json.error && typeof json.error === "object" ? (json.error as JsonObject) : {};
    const message = typeof error.message === "string" ? error.message : `Claude request failed: ${response.status}`;
    throw new Error(message);
  }

  const text = extractClaudeText(json);
  if (!text) {
    throw new Error("Claude response did not include message text.");
  }

  return parseVisionJson(text);
}
