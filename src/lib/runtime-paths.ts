import { existsSync, mkdirSync } from "node:fs";
import path from "node:path";

export function dataDirectory(): string {
  return process.env.HOME_BOOK_STORE_DATA_DIR || process.env.BOOK_STORE_DATA_DIR || path.join(/*turbopackIgnore: true*/ process.cwd(), ".data");
}

export function uploadDirectory(): string {
  return (
    process.env.HOME_BOOK_STORE_UPLOAD_DIR ||
    process.env.BOOK_STORE_UPLOAD_DIR ||
    path.join(/*turbopackIgnore: true*/ process.cwd(), "public", "uploads")
  );
}

export function ensureDirectory(directory: string): void {
  if (!existsSync(directory)) {
    mkdirSync(directory, { recursive: true });
  }
}

export function imagePathForUpload(relativePath: string): string {
  return `/api/uploads/${relativePath.replace(/^\/+/, "")}`;
}

export function localImageFilePath(imagePath: string): string {
  const safePath = imagePath.replace(/^\/+/, "");
  if (safePath.startsWith("api/uploads/")) {
    const relativePath = safePath.replace(/^api\/uploads\//, "");
    return path.join(uploadDirectory(), relativePath);
  }

  if (safePath.startsWith("uploads/")) {
    return path.join(/*turbopackIgnore: true*/ process.cwd(), "public", safePath);
  }

  throw new Error("Image path is outside the uploads directory.");
}
