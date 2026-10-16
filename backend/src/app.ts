import express, { type RequestHandler } from "express";
import cors from "cors";
import type { AuthedRequest } from "./middleware/auth.js";
import type { AIService, ConversationTurn } from "./services/ai/AIService.js";
import { requiresVerifiedKnowledge } from "./services/knowledge/LocalKnowledgeService.js";
import { KnowledgeUnavailableError } from "./services/knowledge/SupabaseKnowledgeService.js";
import type { KnowledgeResult, KnowledgeService, ScheduleEntry } from "./services/knowledge/types.js";

export type AppDeps = {
  frontendOrigin: string;
  requireAuth: RequestHandler;
  knowledgeService: KnowledgeService;
  getAIService: () => AIService | null;
};

const NOT_ENOUGH_INFO = "I don't have enough verified information to answer that accurately.";

/** Builds the Express app without listening, so HTTP behavior can be tested with injected dependencies. */
export function createApp({ frontendOrigin, requireAuth, knowledgeService, getAIService }: AppDeps): express.Express {
  const app = express();
  app.disable("x-powered-by");
  app.use(cors({ origin: frontendOrigin }));
  app.use(express.json({ limit: "100kb" }));

  app.get("/api/health", (_req, res) => { res.json({ ok: true }); });

  // Authenticated identity endpoint used to verify bearer-token handling.
  app.get("/api/me", requireAuth, (req, res) => {
    const { user } = req as AuthedRequest;
    res.json({ id: user.id, email: user.email ?? null });
  });

  app.post("/api/ask", requireAuth, async (req, res) => {
    const body: unknown = req.body;
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return res.status(400).json({ error: { code: "INVALID_REQUEST", message: "Send a JSON object with a message." } });
    }
    const { message, history } = body as { message?: unknown; history?: unknown };
    if (typeof message !== "string" || !message.trim()) {
      return res.status(400).json({ error: { code: "INVALID_REQUEST", message: "A non-empty message is required." } });
    }
    if (message.length > 4000) {
      return res.status(400).json({ error: { code: "INVALID_REQUEST", message: "Message must be 4,000 characters or fewer." } });
    }

    let recentHistory: ConversationTurn[] = [];
    if (history !== undefined) {
      if (!Array.isArray(history) || history.length > 6 || history.some((turn) => {
        if (!turn || typeof turn !== "object") return true;
        const item = turn as { role?: unknown; content?: unknown };
        return !["user", "assistant"].includes(String(item.role)) || typeof item.content !== "string" || !item.content.trim() || item.content.length > 1200;
      })) {
        return res.status(400).json({ error: { code: "INVALID_REQUEST", message: "Conversation history must contain at most six valid recent messages." } });
      }
      recentHistory = history as ConversationTurn[];
    }

    const scheduleMatch = await knowledgeService.findSchedule(message.trim());
    if (scheduleMatch) {
      if (!scheduleMatch.section || !scheduleMatch.entries.length) {
        return res.json({ answer: NOT_ENOUGH_INFO, sources: [] });
      }

      const schedule = {
        request: scheduleMatch.request,
        section: scheduleMatch.section,
        entries: scheduleMatch.entries,
      };
      const answer = schedule.request === "full"
        ? `Here is the schedule for ${schedule.section}.`
        : formatScheduleEntry(schedule.entries[0]);
      return res.json({ answer, sources: [scheduleSource], schedule });
    }

    // Empty results and retrieval failures are different outcomes: no match falls through to the
    // verified-information fallback; a failure never pretends the knowledge base was empty.
    let knowledge: KnowledgeResult[];
    try {
      knowledge = await knowledgeService.search(message.trim(), { accessToken: (req as AuthedRequest).accessToken });
    } catch (error: unknown) {
      if (!(error instanceof KnowledgeUnavailableError)) {
        console.error("[ask] unexpected knowledge service failure");
        return res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "An unexpected server error occurred." } });
      }
      if (error.reason === "unauthorized") {
        return res.status(401).json({ error: { code: "UNAUTHENTICATED", message: "Your session is invalid or has expired." } });
      }
      if (requiresVerifiedKnowledge(message)) {
        return res.status(503).json({ error: { code: "KNOWLEDGE_UNAVAILABLE", message: "School information is temporarily unavailable. Please try again." } });
      }
      knowledge = []; // general question: answer without school context, as before
    }
    if (!knowledge.length && requiresVerifiedKnowledge(message)) {
      return res.json({ answer: NOT_ENOUGH_INFO, sources: [] });
    }

    const ai = getAIService();
    if (!ai) return res.status(503).json({ error: { code: "AI_NOT_CONFIGURED", message: "The AI service is not configured on this server." } });

    try {
      const answer = await ai.generateAnswer({
        message: message.trim(),
        history: recentHistory,
        verifiedContext: knowledge.map(({ document }) => document),
      });
      const sources = knowledge.map(({ document }) => ({ id: document.id, title: document.title, category: document.category }));
      return res.json({ answer, sources });
    } catch (error: unknown) {
      const failure = error as { code?: unknown; status?: unknown; name?: unknown } | null;
      const code = typeof failure?.code === "string" ? failure.code : "";
      const status = typeof failure?.status === "number" ? failure.status : 0;
      if (code === "AI_TIMEOUT" || failure?.name === "TimeoutError") {
        return res.status(504).json({ error: { code: "AI_TIMEOUT", message: "The AI service took too long to respond. Please try again." } });
      }
      if (status === 429) {
        return res.status(429).json({ error: { code: "AI_RATE_LIMITED", message: "The AI service is busy. Please wait a moment and try again." } });
      }
      // Never forward or log provider errors; SDK errors can contain request details.
      return res.status(502).json({ error: { code: "AI_UNAVAILABLE", message: "The AI service is temporarily unavailable. Please try again." } });
    }
  });

  app.use("/api", (_req, res) => { res.status(404).json({ error: { code: "NOT_FOUND", message: "Not found." } }); });

  app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    const status = typeof error === "object" && error !== null && "status" in error ? Number(error.status) : 500;
    if (status === 400 || status === 413) {
      return res.status(status).json({ error: { code: "INVALID_REQUEST", message: status === 413 ? "Request body is too large." : "Request body must be valid JSON." } });
    }
    return res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "An unexpected server error occurred." } });
  });

  return app;
}

const scheduleSource = { id: "schedule-3bsit-1", title: "3BSIT-1 Class Schedule", category: "Class Schedule" };

function formatScheduleEntry(entry: ScheduleEntry): string {
  return `${entry.courseCode} — ${entry.courseName}\n${entry.day}\n${entry.startTime} – ${entry.endTime}\nRoom ${entry.room}`;
}
