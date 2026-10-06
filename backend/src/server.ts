import express from "express";
import cors from "cors";
import { config } from "./config.js";
import { requireAuth, type AuthedRequest } from "./middleware/auth.js";
import { getAIService } from "./services/ai/index.js";
import type { ConversationTurn } from "./services/ai/AIService.js";
import { getKnowledgeService, requiresVerifiedKnowledge } from "./services/knowledge/index.js";
import type { ScheduleEntry } from "./services/knowledge/types.js";

const app = express();
app.disable("x-powered-by");
app.use(cors({ origin: config.frontendOrigin }));
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

  const knowledgeService = getKnowledgeService();
  const scheduleMatch = await knowledgeService.findSchedule(message.trim());
  if (scheduleMatch) {
    if (!scheduleMatch.section || !scheduleMatch.entries.length) {
      return res.json({ answer: "I don't have enough verified information to answer that accurately.", sources: [] });
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

  const knowledge = await knowledgeService.search(message.trim());
  if (!knowledge.length && requiresVerifiedKnowledge(message)) {
    return res.json({ answer: "I don't have enough verified information to answer that accurately.", sources: [] });
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

const scheduleSource = { id: "schedule-3bsit-1", title: "3BSIT-1 Class Schedule", category: "Class Schedule" };

function formatScheduleEntry(entry: ScheduleEntry): string {
  return `${entry.courseCode} — ${entry.courseName}\n${entry.day}\n${entry.startTime} – ${entry.endTime}\nRoom ${entry.room}`;
}

app.use("/api", (_req, res) => { res.status(404).json({ error: { code: "NOT_FOUND", message: "Not found." } }); });

app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  const status = typeof error === "object" && error !== null && "status" in error ? Number(error.status) : 500;
  if (status === 400 || status === 413) {
    return res.status(status).json({ error: { code: "INVALID_REQUEST", message: status === 413 ? "Request body is too large." : "Request body must be valid JSON." } });
  }
  return res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "An unexpected server error occurred." } });
});

app.listen(config.port, () => { console.log(`EagleDesk API listening on :${config.port}`); });
