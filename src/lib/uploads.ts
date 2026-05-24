import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { imagePathForUpload, uploadDirectory } from "@/lib/runtime-paths";

const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

function extensionForFile(file: File): string {
  const ext = path.extname(file.name).toLowerCase();
  if ([".jpg", ".jpeg", ".png", ".webp", ".gif"].includes(ext)) {
    return ext;
  }

  if (file.type === "image/png") {
    return ".png";
  }
  if (file.type === "image/webp") {
    return ".webp";
  }
  if (file.type === "image/gif") {
    return ".gif";
  }
  return ".jpg";
}

export async function saveUploadedImages(files: File[], batchId: string): Promise<string[]> {
  const directory = path.join(uploadDirectory(), "imports", batchId);
  await mkdir(directory, { recursive: true });

  const imagePaths: string[] = [];
  for (const file of files) {
    if (!allowedTypes.has(file.type)) {
      throw new Error(`Unsupported image type: ${file.type || file.name}`);
    }

    const ext = extensionForFile(file);
    const filename = `${Date.now()}-${randomUUID()}${ext}`;
    const targetPath = path.join(directory, filename);
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(targetPath, buffer);
    imagePaths.push(imagePathForUpload(`imports/${batchId}/${filename}`));
  }

  return imagePaths;
}
