import { getAppSettings } from "@/lib/db";
import { parseVisionJson, visionJsonSchema } from "@/lib/vision/parser";
import { imageDataUrl, MissingVisionKeyError, type JsonObject, visionPrompt } from "@/lib/vision/shared";
import type { VisionResult } from "@/lib/types";

function extractOutputText(response: JsonObject): string {
  if (typeof response.output_text === "string") {
    return response.output_text;
  }

  const output = Array.isArray(response.output) ? response.output : [];
  const chunks: string[] = [];

  for (const item of output) {
    if (!item || typeof item !== "object") {
      continue;
    }

    const content = Array.isArray((item as JsonObject).content) ? ((item as JsonObject).content as unknown[]) : [];
    for (const contentItem of content) {
      if (!contentItem || typeof contentItem !== "object") {
        continue;
      }

      const text = (contentItem as JsonObject).text;
      if (typeof text === "string") {
        chunks.push(text);
      }
    }
  }

  return chunks.join("\n");
}

export async function analyzeBookshelfImageWithOpenAi(imagePath: string): Promise<VisionResult> {
  const settings = getAppSettings();
  const apiKey = settings.openaiApiKey;
  if (!apiKey) {
    throw new MissingVisionKeyError("OpenAI", "OPENAI_API_KEY");
  }

  const dataUrl = await imageDataUrl(imagePath);
  const model = settings.openaiVisionModel || "gpt-4.1-mini";

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      authorization: `Bearer ${apiKey}`,
      "content-type": "application/json"
    },
    body: JSON.stringify({
      model,
      input: [
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: visionPrompt()
            },
            {
              type: "input_image",
              image_url: dataUrl,
              detail: "high"
            }
          ]
        }
      ],
      text: {
        format: {
          type: "json_schema",
          name: "book_spine_analysis",
          strict: true,
          schema: visionJsonSchema()
        }
      }
    }),
    signal: AbortSignal.timeout(60000)
  });

  const json = (await response.json()) as JsonObject;
  if (!response.ok) {
    const error = json.error && typeof json.error === "object" ? (json.error as JsonObject) : {};
    const message = typeof error.message === "string" ? error.message : `OpenAI request failed: ${response.status}`;
    throw new Error(message);
  }

  const text = extractOutputText(json);
  if (!text) {
    throw new Error("OpenAI response did not include output text.");
  }

  return parseVisionJson(text);
}
