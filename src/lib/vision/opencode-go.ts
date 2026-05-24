import { getAppSettings } from "@/lib/db";
import { parseVisionJson } from "@/lib/vision/parser";
import { imageDataUrl, MissingVisionKeyError, visionPrompt, type JsonObject } from "@/lib/vision/shared";
import type { VisionResult } from "@/lib/types";

function baseUrl(): string {
  return getAppSettings().opencodeGoBaseUrl.replace(/\/+$/, "");
}

function chatCompletionsUrl(): string {
  const url = baseUrl();
  return url.endsWith("/chat/completions") ? url : `${url}/chat/completions`;
}

function model(): string {
  return getAppSettings().opencodeGoVisionModel || "mimo-v2.5";
}

function maxTokens(): number {
  return Number(getAppSettings().opencodeGoMaxTokens || 2000);
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

export async function analyzeBookshelfImageWithOpenCodeGo(imagePath: string): Promise<VisionResult> {
  const settings = getAppSettings();
  const apiKey = settings.opencodeGoApiKey || settings.visionApiKey;
  if (!apiKey) {
    throw new MissingVisionKeyError("OpenCode Go", "OPENCODE_GO_API_KEY");
  }

  const dataUrl = await imageDataUrl(imagePath);
  const response = await fetch(chatCompletionsUrl(), {
    method: "POST",
    headers: {
      authorization: `Bearer ${apiKey}`,
      "content-type": "application/json"
    },
    body: JSON.stringify({
      model: model(),
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: visionPrompt()
            },
            {
              type: "image_url",
              image_url: {
                url: dataUrl,
                detail: "high"
              }
            }
          ]
        }
      ],
      temperature: 0,
      max_tokens: maxTokens(),
      response_format: {
        type: "json_object"
      }
    }),
    signal: AbortSignal.timeout(60000)
  });

  const json = (await response.json()) as JsonObject;
  if (!response.ok) {
    const error = json.error && typeof json.error === "object" ? (json.error as JsonObject) : {};
    const message = typeof error.message === "string" ? error.message : `OpenCode Go request failed: ${response.status}`;
    throw new Error(message);
  }

  const text = extractChatText(json);
  if (!text) {
    throw new Error("OpenCode Go response did not include message content.");
  }

  return parseVisionJson(text);
}
