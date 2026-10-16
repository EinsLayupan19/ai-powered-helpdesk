import { corpus } from "./corpus.js";
import { rankEntries } from "./ranking.js";
import type { KnowledgeDocument, KnowledgeResult, KnowledgeService, ScheduleEntry, ScheduleMatch } from "./types.js";

// 3rd-year BSIT schedules from docs/KNOWLEDGE_BASE.md section 14. The source lists no rooms for 3BSIT-5 and
// 3BSIT-6, so those rooms are empty strings and are never invented.
const scheduleEntries: ScheduleEntry[] = [
  { section: "3BSIT-1", day: "Thursday", startTime: "7:00 AM", endTime: "10:00 AM", courseCode: "CCL311-18", courseName: "Applications Development & Emerging Technologies (Lab)", room: "M102" },
  { section: "3BSIT-1", day: "Thursday", startTime: "10:00 AM", endTime: "1:00 PM", courseCode: "ITL313-18", courseName: "System Integration & Architecture 2 (Lab)", room: "M108" },
  { section: "3BSIT-1", day: "Friday", startTime: "10:00 AM", endTime: "1:00 PM", courseCode: "ITLEL3-18", courseName: "IT Elective 3 (Lab)", room: "M110" },
  { section: "3BSIT-1", day: "Friday", startTime: "1:00 PM", endTime: "2:30 PM", courseCode: "CITFE1-18", courseName: "Free Elective 1", room: "M411A" },
  { section: "3BSIT-1", day: "Saturday", startTime: "7:00 AM", endTime: "10:00 AM", courseCode: "ITL312-18", courseName: "Information and Assurance and Security 1 (Lab)", room: "M101" },
  { section: "3BSIT-1", day: "Saturday", startTime: "10:00 AM", endTime: "1:00 PM", courseCode: "ITL314-18", courseName: "System Analysis and Design (Lab)", room: "M108" },

  { section: "3BSIT-2", day: "Tuesday", startTime: "7:00 AM", endTime: "10:00 AM", courseCode: "ITLEL3-18", courseName: "IT Elective 3 (Lab)", room: "M108" },
  { section: "3BSIT-2", day: "Tuesday", startTime: "10:00 AM", endTime: "1:00 PM", courseCode: "CCL311-18", courseName: "Applications Development & Emerging Technologies (Lab)", room: "M108" },
  { section: "3BSIT-2", day: "Thursday", startTime: "1:00 PM", endTime: "4:00 PM", courseCode: "ITL313-18", courseName: "System Integration & Architecture 2 (Lab)", room: "M108" },
  { section: "3BSIT-2", day: "Thursday", startTime: "4:00 PM", endTime: "7:00 PM", courseCode: "CITFE1-18", courseName: "Free Elective 1", room: "M108" },
  { section: "3BSIT-2", day: "Saturday", startTime: "7:00 AM", endTime: "10:00 AM", courseCode: "ITL314-18", courseName: "System Analysis and Design (Lab)", room: "M102" },
  { section: "3BSIT-2", day: "Saturday", startTime: "10:00 AM", endTime: "1:00 PM", courseCode: "ITL312-18", courseName: "Information and Assurance and Security 1 (Lab)", room: "M110" },

  { section: "3BSIT-3", day: "Tuesday", startTime: "2:30 PM", endTime: "4:00 PM", courseCode: "CITFE1-18", courseName: "Free Elective 1", room: "M411A" },
  { section: "3BSIT-3", day: "Tuesday", startTime: "4:00 PM", endTime: "7:00 PM", courseCode: "CIT313-18", courseName: "System Integration & Architecture 2 (Lec)", room: "M109" },
  { section: "3BSIT-3", day: "Friday", startTime: "7:00 AM", endTime: "10:00 AM", courseCode: "ITLEL3-18", courseName: "IT Elective 3 (Lab)", room: "M110" },
  { section: "3BSIT-3", day: "Friday", startTime: "10:00 AM", endTime: "1:00 PM", courseCode: "CCL311-18", courseName: "Applications Development & Emerging Technologies (Lab)", room: "M109" },
  { section: "3BSIT-3", day: "Saturday", startTime: "7:00 AM", endTime: "10:00 AM", courseCode: "ITL314-18", courseName: "System Analysis and Design (Lab)", room: "M108" },
  { section: "3BSIT-3", day: "Saturday", startTime: "10:00 AM", endTime: "1:00 PM", courseCode: "ITL312-18", courseName: "Information and Assurance and Security 1 (Lab)", room: "M101" },

  { section: "3BSIT-4", day: "Wednesday", startTime: "7:00 AM", endTime: "10:00 AM", courseCode: "ITL314-18", courseName: "System Analysis and Design (Lab)", room: "M108" },
  { section: "3BSIT-4", day: "Wednesday", startTime: "10:00 AM", endTime: "1:00 PM", courseCode: "ITLEL3-18", courseName: "IT Elective 3 (Lab)", room: "M108" },
  { section: "3BSIT-4", day: "Friday", startTime: "2:30 PM", endTime: "4:00 PM", courseCode: "CITFE1-18", courseName: "Free Elective 1", room: "M410A" },
  { section: "3BSIT-4", day: "Friday", startTime: "4:00 PM", endTime: "7:00 PM", courseCode: "ITL313-18", courseName: "System Integration & Architecture 2 (Lab)", room: "M109" },
  { section: "3BSIT-4", day: "Saturday", startTime: "7:00 AM", endTime: "10:00 AM", courseCode: "CCL311-18", courseName: "Applications Development & Emerging Technologies (Lab)", room: "M104" },
  { section: "3BSIT-4", day: "Saturday", startTime: "10:00 AM", endTime: "1:00 PM", courseCode: "ITL312-18", courseName: "Information and Assurance and Security 1 (Lab)", room: "M110" },

  { section: "3BSIT-5", day: "Wednesday", startTime: "7:00 AM", endTime: "10:00 AM", courseCode: "ITLEL3-18", courseName: "IT Elective 3 (Lab)", room: "" },
  { section: "3BSIT-5", day: "Wednesday", startTime: "10:00 AM", endTime: "1:00 PM", courseCode: "ITL314-18", courseName: "System Analysis and Design (Lab)", room: "" },
  { section: "3BSIT-5", day: "Friday", startTime: "8:30 AM", endTime: "10:00 AM", courseCode: "CITFE1-18", courseName: "Free Elective 1", room: "" },
  { section: "3BSIT-5", day: "Friday", startTime: "10:00 AM", endTime: "1:00 PM", courseCode: "ITL313-18", courseName: "System Integration & Architecture 2 (Lab)", room: "" },
  { section: "3BSIT-5", day: "Saturday", startTime: "10:00 AM", endTime: "1:00 PM", courseCode: "ITL312-18", courseName: "Information and Assurance and Security 1 (Lab)", room: "" },
  { section: "3BSIT-5", day: "Saturday", startTime: "1:00 PM", endTime: "4:00 PM", courseCode: "CCL311-18", courseName: "Applications Development & Emerging Technologies (Lab)", room: "" },

  { section: "3BSIT-6", day: "Tuesday", startTime: "10:00 AM", endTime: "1:00 PM", courseCode: "ITLEL3-18", courseName: "IT Elective 3 (Lab)", room: "" },
  { section: "3BSIT-6", day: "Tuesday", startTime: "1:00 PM", endTime: "4:00 PM", courseCode: "ITL313-18", courseName: "System Integration & Architecture 2 (Lab)", room: "" },
  { section: "3BSIT-6", day: "Wednesday", startTime: "11:30 AM", endTime: "1:00 PM", courseCode: "CITFE1-18", courseName: "Free Elective 1", room: "" },
  { section: "3BSIT-6", day: "Wednesday", startTime: "1:00 PM", endTime: "4:00 PM", courseCode: "ITL314-18", courseName: "System Analysis and Design (Lab)", room: "" },
  { section: "3BSIT-6", day: "Saturday", startTime: "10:00 AM", endTime: "1:00 PM", courseCode: "CCL311-18", courseName: "Applications Development & Emerging Technologies (Lab)", room: "" },
  { section: "3BSIT-6", day: "Saturday", startTime: "1:00 PM", endTime: "4:00 PM", courseCode: "ITL312-18", courseName: "Information and Assurance and Security 1 (Lab)", room: "" },
];

/** Sections with a schedule in the knowledge base, e.g. ["3BSIT-1", ..., "3BSIT-6"]. */
export const scheduleSections = [...new Set(scheduleEntries.map((e) => e.section))];
const entriesFor = (section: string) => scheduleEntries.filter((e) => e.section === section);

function formatEntry(entry: ScheduleEntry): string {
  return `${entry.day}, ${entry.startTime}–${entry.endTime}: ${entry.courseCode} — ${entry.courseName}; ${entry.room ? `Room ${entry.room}` : "Room not listed in the source"}.`;
}

function scheduleDocument(section: string, entries: ScheduleEntry[]): KnowledgeDocument {
  return {
    id: `schedule-${section.toLowerCase()}`,
    title: `${section} Class Schedule`,
    category: "Class Schedule",
    content: [`This schedule applies only to section ${section}. Do not apply it to any other section.`, ...entries.map(formatEntry)].join("\n"),
    source: "docs/KNOWLEDGE_BASE.md section 14 (3rd Year BSIT Class Schedules).",
    schedule: { section, entries },
  };
}

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

function findCourseByName(query: string, candidates: ScheduleEntry[]): ScheduleEntry | undefined {
  const ignored = new Set([...stopWords, ...scheduleTerms, ...scheduleSections.map((s) => `section${s.split("-")[1]}`)]);
  const queryTerms = new Set(tokens(query).filter((token) => !ignored.has(token)));
  if (queryTerms.size < 2) return undefined;

  if (!candidates.length) return undefined;
  const ranked = candidates.map((entry) => {
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
  const sectionEntries = section ? entriesFor(section) : [];
  // Course names repeat across sections, so one section's list is enough to detect a course-name question.
  const courseByName = courseCode ? undefined : findCourseByName(query, sectionEntries.length ? sectionEntries : entriesFor(scheduleSections[0]));
  const hasClassDayQuery = [...queryTokens].some((token) => weekdays.has(token)) && [...queryTokens].some((token) => token === "class" || token === "classes");
  const hasScheduleIntent = Boolean(courseCode || courseByName || hasClassDayQuery || [...queryTokens].some((token) => fullScheduleTerms.has(token)));
  if (!hasScheduleIntent) return null;

  const request = courseCode || courseByName ? "specific" : "full";
  if (!section || !sectionEntries.length) return { request, section, entries: [] };

  if (courseCode) {
    const entry = sectionEntries.find((candidate) => entryMatchesCode(candidate, courseCode));
    return { request: "specific", section, entries: entry ? [entry] : [] };
  }
  if (courseByName) return { request: "specific", section, entries: [courseByName] };

  return { request: "full", section, entries: sectionEntries };
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
    // Schedule questions are answered from the schedules only; everything else from the verified entries.
    if (!scheduleMatch) {
      return rankEntries(query, corpus).map(({ entry, score }) => ({
        document: { id: entry.slug, title: entry.title, category: entry.category, content: entry.content, source: entry.source },
        relevance: score,
      }));
    }
    if (!scheduleMatch.section || !scheduleMatch.entries.length) return [];

    const queryTokens = [...new Set(tokens(query))];
    if (!queryTokens.length) return [];
    const document = scheduleDocument(scheduleMatch.section, scheduleMatch.entries);
    const documentTokens = new Set(tokens(`${document.title} ${document.category} ${document.content}`));
    const hits = queryTokens.filter((token) => documentTokens.has(token));
    const relevance = hits.length / queryTokens.length;
    return relevance >= 0.2 ? [{ document, relevance }] : [];
  }

  async findSchedule(query: string): Promise<ScheduleMatch | null> {
    return matchScheduleQuery(query);
  }
}
