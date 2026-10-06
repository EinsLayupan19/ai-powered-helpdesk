import { config } from "../../config.js";
import type { AIService } from "./AIService.js";
import { GeminiProvider } from "./GeminiProvider.js";

let provider: AIService | null = null;

export function getAIService(): AIService | null {
  if (!config.geminiApiKey?.trim()) return null;
  provider ??= new GeminiProvider(config.geminiApiKey, config.geminiModel);
  return provider;
}
