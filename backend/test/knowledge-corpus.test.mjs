// Local mode answers from the verified knowledge base (docs/KNOWLEDGE_BASE.md, copied into corpus.ts).
// Each common student question must retrieve the entry that answers it; unrelated questions retrieve nothing.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { LocalKnowledgeService, requiresVerifiedKnowledge } from "../dist/services/knowledge/index.js";
import { corpus } from "../dist/services/knowledge/corpus.js";

const knowledge = new LocalKnowledgeService();
const ids = async (q) => (await knowledge.search(q)).map((r) => r.document.id);

const expected = [
  ["How can I get my student ID?", "student-id-request"],
  ["I lost my student ID, what should I do?", "lost-student-id"],
  ["How can I get a replacement school ID?", "lost-student-id"],
  ["How do I enroll in my subjects for next semester?", "enrollment-subjects"],
  ["Where can I check my grades?", "grades"],
  ["How do I know if I'm officially enrolled?", "enrollment-status"],
  ["Where can I check my remaining balance?", "fee-balance"],
  ["How do I pay my tuition?", "paying-fees"],
  ["Where is the cashier?", "paying-fees"],
  ["How can I request a good moral certificate?", "good-moral-certificate"],
  ["How do I get a certificate of enrollment?", "certificate-of-enrollment"],
  ["I can't log in to Automate", "automate-login"],
  ["Where can I see school announcements?", "school-announcements"],
  ["When are the midterms?", "academic-calendar"],
  ["What were the holidays in AY 2024-2025?", "calendar-ay-2024-2025"],
  ["Where is NEU located?", "neu-general-info"],
  ["What are the admission requirements for freshmen?", "admissions"],
  ["What are the enrollment steps?", "college-enrollment-procedure"],
  ["How do I contact CSD?", "university-systems-csd"],
  ["Can I pay through online banking?", "payment-procedures"],
  ["Where is the guidance office?", "student-services"],
  ["What programs are offered in the College of Informatics?", "academics-programs"],
  ["What are the virtual office hours?", "contact-virtual-offices"],
];

for (const [question, id] of expected) {
  test(`"${question}" retrieves ${id}`, async () => {
    const found = await ids(question);
    assert.ok(found.includes(id), `got ${JSON.stringify(found)}`);
    assert.ok(found.length <= 3);
  });
}

test("the best match comes first for unambiguous questions", async () => {
  assert.equal((await ids("I lost my student ID, what should I do?"))[0], "lost-student-id");
  assert.equal((await ids("How can I request a good moral certificate?"))[0], "good-moral-certificate");
  assert.equal((await ids("Can I pay through online banking?"))[0], "payment-procedures");
});

test("general and unrelated questions retrieve nothing", async () => {
  for (const q of ["What is HTML?", "Explain recursion in Python", "What is a program in Java?", "Tell me a school policy that isn't in the knowledge base."]) {
    assert.deepEqual(await ids(q), [], q);
  }
});

test("entries carry their title, category, content and source", async () => {
  const [result] = await knowledge.search("I lost my student ID");
  assert.equal(result.document.title, "Lost student ID");
  assert.equal(result.document.category, "Student ID");
  assert.match(result.document.content, /Affidavit of Loss/);
  assert.match(result.document.source, /KNOWLEDGE_BASE\.md section 10/);
  assert.ok(result.relevance > 0);
});

test("every entry's answer text appears in docs/KNOWLEDGE_BASE.md (no invented content)", () => {
  const kb = readFileSync(new URL("../../docs/KNOWLEDGE_BASE.md", import.meta.url), "utf8").replace(/\*\*/g, "");
  for (const entry of corpus.filter((e) => /^Question:/.test(e.content))) {
    const answer = entry.content.split("\nAnswer: ")[1].split("\n")[0];
    assert.ok(kb.includes(answer), `${entry.slug}: answer not found in KNOWLEDGE_BASE.md`);
  }
});

test("slugs are unique and every entry has keywords", () => {
  assert.equal(new Set(corpus.map((e) => e.slug)).size, corpus.length);
  for (const e of corpus) assert.ok(e.keywords.length > 0, e.slug);
});

test("school-domain detection is unchanged for these questions", () => {
  assert.equal(requiresVerifiedKnowledge("How do I pay my tuition?"), true);
  assert.equal(requiresVerifiedKnowledge("What is HTML?"), false);
});
