import type { KnowledgeDocument, KnowledgeResult, KnowledgeService, ScheduleEntry, ScheduleMatch } from "./types.js";

const scheduleEntries: ScheduleEntry[] = [
  { section: "3BSIT-1", day: "Thursday", startTime: "7:00 AM", endTime: "10:00 AM", courseCode: "CCL311-18", courseName: "Applications Development & Emerging Technologies (Lab)", room: "M102" },
  { section: "3BSIT-1", day: "Thursday", startTime: "10:00 AM", endTime: "1:00 PM", courseCode: "ITL313-18", courseName: "System Integration & Architecture 2 (Lab)", room: "M108" },
  { section: "3BSIT-1", day: "Friday", startTime: "10:00 AM", endTime: "1:00 PM", courseCode: "ITLEL3-18", courseName: "IT Elective 3 (Lab)", room: "M110" },
  { section: "3BSIT-1", day: "Friday", startTime: "1:00 PM", endTime: "2:30 PM", courseCode: "CITFE1-18", courseName: "Free Elective 1", room: "M411A" },
  { section: "3BSIT-1", day: "Saturday", startTime: "7:00 AM", endTime: "10:00 AM", courseCode: "ITL312-18", courseName: "Information and Assurance and Security 1 (Lab)", room: "M101" },
  { section: "3BSIT-1", day: "Saturday", startTime: "10:00 AM", endTime: "1:00 PM", courseCode: "ITL314-18", courseName: "System Analysis and Design (Lab)", room: "M108" },
];

function formatEntry(entry: ScheduleEntry): string {
  return `${entry.day}, ${entry.startTime}–${entry.endTime}: ${entry.courseCode} — ${entry.courseName}; Room ${entry.room}.`;
}

const scheduleDocument: KnowledgeDocument = {
  id: "schedule-3bsit-1",
  title: "3BSIT-1 Class Schedule",
  category: "Class Schedule",
  content: ["This schedule applies only to section 3BSIT-1. Do not apply it to any other section.", ...scheduleEntries.map(formatEntry)].join("\n"),
  source: "Approved 3BSIT-1 schedule provided for EagleDesk Phase 4.",
  schedule: { section: "3BSIT-1", entries: scheduleEntries },
};

const stopWords = new Set([
  "a", "an", "and", "are", "am", "can", "do", "does", "for", "how", "i", "is", "it", "me", "my", "of", "on", "please", "the", "to", "what", "when", "where", "which", "who", "with",
]);

function tokens(value: string): string[] {
  const normalized = value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\b(?:sched(?:ule)?s?|timetables?)\b/g, "schedule")
    .replace(/\b3\s*bsit\s*[- ]?\s*(\d+)\b/g, "section$1")
    .replace(/[^a-z0-9]+/g, " ");
  return normalized.split(/\s+/).filter((token) => token.length > 1 && !stopWords.has(token));
}

const scheduleTerms = new Set([
  "schedule", "class", "classes", "course", "subject", "day", "time", "room", "when", "timetable",
  "thursday", "thurs", "friday", "fri", "saturday", "sat",
]);

const fullScheduleTerms = new Set(["schedule", "class", "classes", "timetable"]);
const weekdays = new Set(["thursday", "thurs", "friday", "fri", "saturday", "sat"]);

const schoolTerms = new Set([
  "school", "university", "neu", "student", "students", "class", "classes", "course", "courses", "subject", "subjects", "section", "schedule", "room", "campus", "policy", "policies", "procedure", "procedures", "enroll", "enrollment", "registration", "tuition", "fee", "fees", "cashier", "registrar", "office", "staff", "faculty", "professor", "teacher", "grade", "grades", "automate", "exam", "exams", "deadline", "calendar", "holiday", "semester", "academic", "id", "certificate", "payment", "clearance",
]);

function explicitSection(query: string): string | null {
  const sections = [...query.matchAll(/\b3\s*bsit\s*[- ]?\s*(\d+)\b/gi)].map((match) => `3BSIT-${match[1]}`);
  const uniqueSections = [...new Set(sections)];
  return uniqueSections.length === 1 ? uniqueSections[0] : null;
}

function extractCourseCode(query: string): string | null {
  return /\b([A-Z]{2,}[A-Z0-9]*\d{2,}(?:-\d+)?)\b/i.exec(query)?.[1]?.toUpperCase() ?? null;
}

function entryMatchesCode(entry: ScheduleEntry, queryCode: string): boolean {
  const requested = queryCode.toUpperCase().split("-");
  const stored = entry.courseCode.toUpperCase().split("-");
  return requested[0] === stored[0] && (requested.length === 1 || requested[1] === stored[1]);
}

function findCourseByName(query: string): ScheduleEntry | undefined {
  const ignored = new Set([...stopWords, ...scheduleTerms, "section1"]);
  const queryTerms = new Set(tokens(query).filter((token) => !ignored.has(token)));
  if (queryTerms.size < 2) return undefined;

  const ranked = scheduleEntries.map((entry) => {
    const nameTerms = new Set(tokens(entry.courseName));
    const matched = [...queryTerms].filter((token) => nameTerms.has(token)).length;
    return { entry, matched, ratio: matched / queryTerms.size };
  }).sort((a, b) => b.matched - a.matched || b.ratio - a.ratio);

  return ranked[0].matched >= 2 && ranked[0].ratio >= 0.5 ? ranked[0].entry : undefined;
}

/** Identifies full and course-specific schedule lookups without inferring a section. */
function matchScheduleQuery(query: string): ScheduleMatch | null {
  const queryTokens = new Set(tokens(query));
  const section = explicitSection(query);
  const courseCode = extractCourseCode(query);
  const courseByName = courseCode ? undefined : findCourseByName(query);
  const hasClassDayQuery = [...queryTokens].some((token) => weekdays.has(token)) && [...queryTokens].some((token) => token === "class" || token === "classes");
  const hasScheduleIntent = Boolean(courseCode || courseByName || hasClassDayQuery || [...queryTokens].some((token) => fullScheduleTerms.has(token)));
  if (!hasScheduleIntent) return null;

  const request = courseCode || courseByName ? "specific" : "full";
  if (section !== "3BSIT-1") return { request, section, entries: [] };

  if (courseCode) {
    const entry = scheduleEntries.find((candidate) => entryMatchesCode(candidate, courseCode));
    return { request: "specific", section, entries: entry ? [entry] : [] };
  }
  if (courseByName) return { request: "specific", section, entries: [courseByName] };

  return { request: "full", section, entries: scheduleEntries };
}

/** Conservative school-domain detection keeps unknown school questions out of unguided generation. */
export function requiresVerifiedKnowledge(query: string): boolean {
  if (/\b3\s*bsit\s*[- ]?\s*\d+\b/i.test(query)) return true;
  if (/\b[A-Z]{2,}[A-Z0-9]*\d{2,}(?:-\d+)?\b/i.test(query)) return true;
  return tokens(query).some((token) => schoolTerms.has(token));
}

export class LocalKnowledgeService implements KnowledgeService {
  async search(query: string): Promise<KnowledgeResult[]> {
    const scheduleMatch = await this.findSchedule(query);
    if (!scheduleMatch?.section || !scheduleMatch.entries.length) return [];

    const queryTokens = [...new Set(tokens(query))];
    if (!queryTokens.length) return [];
    const document: KnowledgeDocument = {
      ...scheduleDocument,
      content: ["This schedule applies only to section 3BSIT-1. Do not apply it to any other section.", ...scheduleMatch.entries.map(formatEntry)].join("\n"),
      schedule: { section: scheduleMatch.section, entries: scheduleMatch.entries },
    };
    const documentTokens = new Set(tokens(`${document.title} ${document.category} ${document.content}`));
    const hits = queryTokens.filter((token) => documentTokens.has(token));
    const relevance = hits.length / queryTokens.length;
    return relevance >= 0.2 ? [{ document, relevance }] : [];
  }

  async findSchedule(query: string): Promise<ScheduleMatch | null> {
    return matchScheduleQuery(query);
  }
}
