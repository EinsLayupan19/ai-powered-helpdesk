import type { KnowledgeService } from "./types.js";
import { LocalKnowledgeService } from "./LocalKnowledgeService.js";

let knowledgeService: KnowledgeService | null = null;

export function getKnowledgeService(): KnowledgeService {
  knowledgeService ??= new LocalKnowledgeService();
  return knowledgeService;
}

export type { KnowledgeDocument, KnowledgeResult, KnowledgeService, ScheduleEntry, ScheduleMatch } from "./types.js";
export { LocalKnowledgeService, requiresVerifiedKnowledge } from "./LocalKnowledgeService.js";
