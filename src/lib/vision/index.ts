import { getAppSettings } from "@/lib/db";
import { analyzeBookshelfImageWithOpenAi } from "@/lib/vision/openai";
import { analyzeBookshelfImageWithOpenCodeGo } from "@/lib/vision/opencode-go";
import type { VisionResult } from "@/lib/types";

export { MissingVisionKeyError } from "@/lib/vision/shared";

export type VisionProvider = "opencode-go" | "openai";

export function configuredVisionProvider(): VisionProvider {
  return getAppSettings().visionProvider;
}

export async function analyzeBookshelfImage(imagePath: string): Promise<VisionResult> {
  const provider = configuredVisionProvider();
  if (provider === "openai") {
    return analyzeBookshelfImageWithOpenAi(imagePath);
  }

  return analyzeBookshelfImageWithOpenCodeGo(imagePath);
}
