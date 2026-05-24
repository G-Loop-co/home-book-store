import { readFile } from "node:fs/promises";
import path from "node:path";
import { localImageFilePath } from "@/lib/runtime-paths";

export type JsonObject = Record<string, unknown>;

export class MissingVisionKeyError extends Error {
  constructor(provider: string, envVar: string) {
    super(`${envVar} is not configured for ${provider}.`);
    this.name = "MissingVisionKeyError";
  }
}

export function visionPrompt(): string {
  return [
    "Return JSON only. Analyze this bookshelf photo and identify each visible book spine.",
    "Include books even when the title is partially visible, but use low confidence for uncertain items.",
    "Read Traditional Chinese, Simplified Chinese, English, vertical text, and rotated spine text.",
    "Before final JSON, consolidate visible spine text with well-known book metadata when you are confident: use canonical title, author, publisher, language, and visible or confidently known ISBN.",
    "Do not claim you searched the internet. If metadata is not visually present or confidently known, leave the field empty and explain uncertainty in notes.",
    "Always preserve the raw visible/visual text in spineText so downstream metadata search can verify it.",
    "Use normalized bounding boxes relative to the whole image: x, y, width, height from 0 to 1.",
    "If a field is unknown, return an empty string. Do not invent ISBNs.",
    "Return this shape exactly: {\"books\":[{\"title\":\"\",\"author\":\"\",\"publisher\":\"\",\"language\":\"\",\"spineText\":\"\",\"isbn\":\"\",\"bbox\":{\"x\":0,\"y\":0,\"width\":1,\"height\":1},\"confidence\":0,\"notes\":\"\"}]}"
  ].join("\n");
}

export function mimeTypeForPath(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === ".png") {
    return "image/png";
  }
  if (ext === ".webp") {
    return "image/webp";
  }
  if (ext === ".gif") {
    return "image/gif";
  }
  return "image/jpeg";
}

export function publicImagePath(imagePath: string): string {
  return localImageFilePath(imagePath);
}

export async function imageDataUrl(imagePath: string): Promise<string> {
  const filePath = publicImagePath(imagePath);
  const imageBuffer = await readFile(filePath);
  return `data:${mimeTypeForPath(filePath)};base64,${imageBuffer.toString("base64")}`;
}

export async function imageBase64(imagePath: string): Promise<{ data: string; mimeType: string }> {
  const filePath = publicImagePath(imagePath);
  const imageBuffer = await readFile(filePath);
  return {
    data: imageBuffer.toString("base64"),
    mimeType: mimeTypeForPath(filePath)
  };
}
