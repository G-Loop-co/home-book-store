import type { AppSettings, VisionProviderName } from "@/lib/types";

export type VisionProviderCapability = "vision" | "text";
export type AppSettingKey = keyof AppSettings;

export interface VisionProviderDefinition {
  id: VisionProviderName;
  label: string;
  capabilities: VisionProviderCapability[];
  apiKeySetting: AppSettingKey;
  modelSetting: AppSettingKey;
  maxTokensSetting?: AppSettingKey;
  baseUrlSetting?: AppSettingKey;
  helpKey: string;
  apiKeyHelpKey: string;
  recommended?: boolean;
}

export const VISION_PROVIDER_DEFINITIONS: VisionProviderDefinition[] = [
  {
    id: "opencode-go",
    label: "OpenCode Go",
    capabilities: ["vision", "text"],
    apiKeySetting: "opencodeGoApiKey",
    modelSetting: "opencodeGoVisionModel",
    maxTokensSetting: "opencodeGoMaxTokens",
    baseUrlSetting: "opencodeGoBaseUrl",
    helpKey: "opencodeHelp",
    apiKeyHelpKey: "opencodeApiKeyHelp",
    recommended: true
  },
  {
    id: "openai",
    label: "OpenAI",
    capabilities: ["vision", "text"],
    apiKeySetting: "openaiApiKey",
    modelSetting: "openaiVisionModel",
    helpKey: "openaiHelp",
    apiKeyHelpKey: "openaiApiKeyHelp"
  },
  {
    id: "grok",
    label: "Grok",
    capabilities: ["vision", "text"],
    apiKeySetting: "grokApiKey",
    modelSetting: "grokVisionModel",
    maxTokensSetting: "grokMaxTokens",
    baseUrlSetting: "grokBaseUrl",
    helpKey: "grokHelp",
    apiKeyHelpKey: "grokApiKeyHelp"
  },
  {
    id: "gemini",
    label: "Gemini",
    capabilities: ["vision", "text"],
    apiKeySetting: "geminiApiKey",
    modelSetting: "geminiVisionModel",
    maxTokensSetting: "geminiMaxTokens",
    helpKey: "geminiHelp",
    apiKeyHelpKey: "geminiApiKeyHelp"
  },
  {
    id: "claude",
    label: "Claude",
    capabilities: ["vision", "text"],
    apiKeySetting: "claudeApiKey",
    modelSetting: "claudeVisionModel",
    maxTokensSetting: "claudeMaxTokens",
    helpKey: "claudeHelp",
    apiKeyHelpKey: "claudeApiKeyHelp"
  }
];

export const DEFAULT_VISION_PROVIDER: VisionProviderName = "opencode-go";

export function visionProviderDefinition(provider: VisionProviderName): VisionProviderDefinition {
  return VISION_PROVIDER_DEFINITIONS.find((definition) => definition.id === provider) ?? VISION_PROVIDER_DEFINITIONS[0]!;
}

export function normalizeVisionProviderName(value: string | undefined): VisionProviderName {
  const normalized = value?.toLowerCase();
  if (normalized === "gork") {
    return "grok";
  }
  return VISION_PROVIDER_DEFINITIONS.some((definition) => definition.id === normalized)
    ? (normalized as VisionProviderName)
    : DEFAULT_VISION_PROVIDER;
}
