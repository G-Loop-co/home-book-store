import { z } from "zod";
import type { VisionResult } from "@/lib/types";

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function normalizeVisionResult(result: VisionResult): VisionResult {
  return {
    books: result.books.map((book) => {
      const x = clamp01(book.bbox.x);
      const y = clamp01(book.bbox.y);
      return {
        ...book,
        bbox: {
          x,
          y,
          width: Math.min(clamp01(book.bbox.width), 1 - x),
          height: Math.min(clamp01(book.bbox.height), 1 - y)
        }
      };
    })
  };
}

export const bboxSchema = z
  .object({
    x: z.number().min(0).max(1).default(0),
    y: z.number().min(0).max(1).default(0),
    width: z.number().min(0).max(1).default(1),
    height: z.number().min(0).max(1).default(1)
  })
  .default({ x: 0, y: 0, width: 1, height: 1 });

export const visionBookSchema = z.object({
  title: z.string().default(""),
  author: z.string().default(""),
  publisher: z.string().default(""),
  language: z.string().default(""),
  spineText: z.string().default(""),
  isbn: z.string().default(""),
  bbox: bboxSchema,
  confidence: z.number().min(0).max(1).default(0.5),
  notes: z.string().default("")
});

export const visionResultSchema = z.object({
  books: z.array(visionBookSchema)
});

export function parseVisionJson(rawText: string): VisionResult {
  const trimmed = rawText.trim();
  const unfenced = trimmed
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
  const firstBrace = unfenced.indexOf("{");
  const lastBrace = unfenced.lastIndexOf("}");

  if (firstBrace === -1 || lastBrace === -1 || lastBrace < firstBrace) {
    throw new Error("Vision response did not contain a JSON object.");
  }

  const jsonText = unfenced.slice(firstBrace, lastBrace + 1);
  const parsed: unknown = JSON.parse(jsonText);
  return normalizeVisionResult(visionResultSchema.parse(parsed));
}

export function visionJsonSchema(): Record<string, unknown> {
  return {
    type: "object",
    additionalProperties: false,
    required: ["books"],
    properties: {
      books: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["title", "author", "publisher", "language", "spineText", "isbn", "bbox", "confidence", "notes"],
          properties: {
            title: { type: "string" },
            author: { type: "string" },
            publisher: { type: "string" },
            language: { type: "string" },
            spineText: { type: "string" },
            isbn: { type: "string" },
            bbox: {
              type: "object",
              additionalProperties: false,
              required: ["x", "y", "width", "height"],
              properties: {
                x: { type: "number", minimum: 0, maximum: 1 },
                y: { type: "number", minimum: 0, maximum: 1 },
                width: { type: "number", minimum: 0, maximum: 1 },
                height: { type: "number", minimum: 0, maximum: 1 }
              }
            },
            confidence: { type: "number", minimum: 0, maximum: 1 },
            notes: { type: "string" }
          }
        }
      }
    }
  };
}
