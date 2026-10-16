import express, { type RequestHandler } from "express";
import cors from "cors";
import { join, sep } from "node:path";
import type { AuthedRequest } from "./middleware/auth.js";
import type { AIService, ConversationTurn } from "./services/ai/AIService.js";
import { STUDENT_ID_PATTERN, type StudentSignIn } from "./services/auth/studentSignIn.js";
import { requiresVerifiedKnowledge, scheduleSections } from "./services/knowledge/LocalKnowledgeService.js";
import { KnowledgeUnavailableError } from "./services/knowledge/SupabaseKnowledgeService.js";
import type { KnowledgeResult, KnowledgeService, ScheduleEntry } from "./services/knowledge/types.js";

export type AppDeps = {
  frontendOrigin: string;
  requireAuth: RequestHandler;
  knowledgeService: KnowledgeService;
  getAIService: () => AIService | null;
  /** Folder with the built frontend (Vite's dist/). When set, the app serves it from the same origin as /api. */
  staticDir?: string;
  /** Per-student limit on /api/ask. Defaults to 30 questions per 10 minutes. */
  askRateLimit?: { limit: number; windowMs: number };
  /** Student ID sign-in (needs the service-role key on the server). null turns it off with a clear message. */
  studentSignIn?: StudentSignIn | null;
  /** Limits on /api/auth/student-sign-in. Defaults to 10 per device and 5 per student ID per 15 minutes. */
  signInRateLimit?: { perIp: number; perStudentId: number; windowMs: number };
};

const RATE_LIMITED = { error: { code: "RATE_LIMITED", message: "You're sending questions too quickly. Please wait a few minutes and try again." } };

/**
 * In-memory sliding window keyed by any string. Fine for a single server instance.
 * hit() records an attempt and returns null, or, when the key is over its limit, the seconds until it frees up.
 */
function slidingWindow(limit: number, windowMs: number) {
  const hits = new Map<string, number[]>();
  return {
    hit(key: string): number | null {
      const now = Date.now();
      const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
      if (recent.length >= limit) {
        hits.set(key, recent);
        return Math.max(1, Math.ceil((recent[0] + windowMs - now) / 1000));
      }
      recent.push(now);
      hits.set(key, recent);
      if (hits.size > 10_000) for (const [k, times] of hits) if (!times.some((t) => now - t < windowMs)) hits.delete(k);
      return null;
    },
  };
}

/** Per authenticated user. */
function perUserLimit({ limit, windowMs }: { limit: number; windowMs: number }): RequestHandler {
  const window = slidingWindow(limit, windowMs);
  return (req, res, next) => {
    const retryAfter = window.hit((req as AuthedRequest).user.id);
    if (retryAfter !== null) {
      res.setHeader("Retry-After", String(retryAfter));
      return res.status(429).json(RATE_LIMITED);
    }
    next();
  };
}

const SIGN_IN_INVALID_REQUEST = { error: { code: "INVALID_REQUEST", message: "Enter your student ID (for example 12-34567-890) and your password." } };
const SIGN_IN_OFF = { error: { code: "STUDENT_SIGN_IN_UNAVAILABLE", message: "Student ID sign-in isn't set up yet. Sign in with your university email." } };
const SIGN_IN_LIMITED = { error: { code: "RATE_LIMITED", message: "Too many sign-in attempts. Please wait a few minutes and try again." } };
const SIGN_IN_WRONG = { error: { code: "INVALID_CREDENTIALS", message: "Incorrect student ID or password." } };
const SIGN_IN_DOWN = { error: { code: "AUTH_UNAVAILABLE", message: "Could not reach the sign-in service. Try again." } };

const NOT_ENOUGH_INFO = "I don't have enough verified information to answer that accurately.";
// From docs/KNOWLEDGE_BASE.md: schedules are checked in Automate (section 1), and the section is asked for when
// it is not known (section 14, schedule-answer rule 1).
const AUTOMATE_HINT = "You can check your class schedule through Automate while at school.";
const sectionRange = scheduleSections.length > 1 ? `${scheduleSections[0]} to ${scheduleSections[scheduleSections.length - 1]}` : scheduleSections[0];
const ASK_SECTION = `Which section are you in? I have the class schedules for ${sectionRange}, so ask for example "schedule for ${scheduleSections[0]}". ${AUTOMATE_HINT}`;

/** Builds the Express app without listening, so HTTP behavior can be tested with injected dependencies. */
export function createApp({ frontendOrigin, requireAuth, knowledgeService, getAIService, staticDir, askRateLimit, studentSignIn = null, signInRateLimit }: AppDeps): express.Express {
  const app = express();
  app.disable("x-powered-by");
  app.set("trust proxy", 1); // hosting platforms put one HTTPS proxy in front of the app
  app.use((_req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    next();
  });
  app.use(cors({ origin: frontendOrigin }));
  app.use(express.json({ limit: "100kb" }));

  app.get("/api/health", (_req, res) => { res.json({ ok: true }); });

  // Authenticated identity endpoint used to verify bearer-token handling.
  app.get("/api/me", requireAuth, (req, res) => {
    const { user } = req as AuthedRequest;
    res.json({ id: user.id, email: user.email ?? null });
  });

  // Sign in with a student ID instead of an email. The server looks the account up and returns only a session;
  // it never reveals whether an ID exists or which email it belongs to.
  const signInLimits = signInRateLimit ?? { perIp: 10, perStudentId: 5, windowMs: 15 * 60_000 };
  const signInByIp = slidingWindow(signInLimits.perIp, signInLimits.windowMs);
  const signInById = slidingWindow(signInLimits.perStudentId, signInLimits.windowMs);
  app.post("/api/auth/student-sign-in", async (req, res) => {
    res.setHeader("Cache-Control", "no-store");
    const { studentId, password } = (req.body && typeof req.body === "object" ? req.body : {}) as { studentId?: unknown; password?: unknown };
    const id = typeof studentId === "string" ? studentId.trim() : "";
    if (!STUDENT_ID_PATTERN.test(id) || typeof password !== "string" || !password || password.length > 200) {
      return res.status(400).json(SIGN_IN_INVALID_REQUEST);
    }
    if (!studentSignIn) return res.status(503).json(SIGN_IN_OFF);
    const retryAfter = signInByIp.hit(req.ip ?? "unknown") ?? signInById.hit(id);
    if (retryAfter !== null) {
      res.setHeader("Retry-After", String(retryAfter));
      return res.status(429).json(SIGN_IN_LIMITED);
    }
    const result = await studentSignIn(id, password);
    if (result.ok) return res.json({ session: result.session });
    if (result.reason === "invalid") return res.status(401).json(SIGN_IN_WRONG);
    if (result.reason === "rate_limited") return res.status(429).json(SIGN_IN_LIMITED);
    return res.status(503).json(SIGN_IN_DOWN);
  });

  app.post("/api/ask", requireAuth, perUserLimit(askRateLimit ?? { limit: 30, windowMs: 10 * 60_000 }), async (req, res) => {
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
      if (!scheduleMatch.section) return res.json({ answer: ASK_SECTION, sources: [] });
      if (!scheduleMatch.entries.length) return res.json({ answer: `${NOT_ENOUGH_INFO} ${AUTOMATE_HINT}`, sources: [] });

      const schedule = {
        request: scheduleMatch.request,
        section: scheduleMatch.section,
        entries: scheduleMatch.entries,
      };
      const answer = schedule.request === "full"
        ? `Here is the schedule for ${schedule.section}.`
        : formatScheduleEntry(schedule.entries[0]);
      const source = { id: `schedule-${schedule.section.toLowerCase()}`, title: `${schedule.section} Class Schedule`, category: "Class Schedule" };
      return res.json({ answer, sources: [source], schedule });
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

  if (staticDir) {
    // Vite fingerprints files in assets/, so they can be cached for a year; index.html must be revalidated.
    app.use(express.static(staticDir, {
      index: false,
      setHeaders: (res, path) => {
        res.setHeader("Cache-Control", path.includes(`${sep}assets${sep}`) ? "public, max-age=31536000, immutable" : "no-cache");
      },
    }));
    // Any other page path loads the app (the frontend has no server-side routes). Missing assets stay 404s.
    app.get(/^(?!\/api\/|\/assets\/).*/, (_req, res) => {
      res.setHeader("Cache-Control", "no-cache");
      res.sendFile(join(staticDir, "index.html"));
    });
  }

  app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    const status = typeof error === "object" && error !== null && "status" in error ? Number(error.status) : 500;
    if (status === 400 || status === 413) {
      return res.status(status).json({ error: { code: "INVALID_REQUEST", message: status === 413 ? "Request body is too large." : "Request body must be valid JSON." } });
    }
    return res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "An unexpected server error occurred." } });
  });

  return app;
}

function formatScheduleEntry(entry: ScheduleEntry): string {
  return `${entry.courseCode} — ${entry.courseName}\n${entry.day}\n${entry.startTime} – ${entry.endTime}\n${entry.room ? `Room ${entry.room}` : "Room not listed in the source"}`;
}
