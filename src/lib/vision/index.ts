import { getAppSettings } from "@/lib/db";
import { analyzeBookshelfImageWithClaude } from "@/lib/vision/claude";
import { analyzeBookshelfImageWithGemini } from "@/lib/vision/gemini";
import { analyzeBookshelfImageWithGrok } from "@/lib/vision/grok";
import { analyzeBookshelfImageWithOpenAi } from "@/lib/vision/openai";
import { analyzeBookshelfImageWithOpenCodeGo } from "@/lib/vision/opencode-go";
import type { VisionProviderName, VisionResult } from "@/lib/types";

export { MissingVisionKeyError } from "@/lib/vision/shared";

export type VisionProvider = VisionProviderName;

const analyzers: Record<VisionProviderName, (imagePath: string) => Promise<VisionResult>> = {
  "opencode-go": analyzeBookshelfImageWithOpenCodeGo,
  openai: analyzeBookshelfImageWithOpenAi,
  grok: analyzeBookshelfImageWithGrok,
  gemini: analyzeBookshelfImageWithGemini,
  claude: analyzeBookshelfImageWithClaude
};

export function configuredVisionProvider(): VisionProvider {
  return getAppSettings().visionProvider;
}

export async function analyzeBookshelfImage(imagePath: string): Promise<VisionResult> {
  const provider = configuredVisionProvider();
  return analyzers[provider](imagePath);
}
