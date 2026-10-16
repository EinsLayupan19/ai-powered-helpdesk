import assert from "node:assert/strict";
import test from "node:test";
import { LocalKnowledgeService, requiresVerifiedKnowledge } from "../dist/services/knowledge/index.js";

const knowledge = new LocalKnowledgeService();

test("retrieves structured 3BSIT-1 entries for a full schedule request", async () => {
  const results = await knowledge.search("What is the schedule of 3BSIT-1?");
  assert.equal(results.length, 1);
  assert.equal(results[0].document.id, "schedule-3bsit-1");
  assert.equal(results[0].document.schedule?.section, "3BSIT-1");
  assert.equal(results[0].document.schedule?.entries.length, 6);
  assert.equal(results[0].document.schedule?.entries[5].courseCode, "ITL314-18");
});

test("finds the ITL314 time and room in the section-specific schedule", async () => {
  const results = await knowledge.search("What time is ITL314 for 3BSIT-1?");
  assert.equal(results.length, 1);
  assert.deepEqual(results[0].document.schedule?.entries[0], {
    section: "3BSIT-1", day: "Saturday", startTime: "10:00 AM", endTime: "1:00 PM",
    courseCode: "ITL314-18", courseName: "System Analysis and Design (Lab)", room: "M108",
  });
});

test("finds the ITL313 room in the section-specific schedule", async () => {
  const results = await knowledge.search("What room is ITL313 for 3BSIT-1?");
  assert.equal(results.length, 1);
  assert.equal(results[0].document.schedule?.entries[0].room, "M108");
});

test("recognizes natural schedule query variations for the explicitly named section", async (t) => {
  const queries = [
    "sched for 3bsit-1",
    "schedule for 3bsit-1",
    "3bsit-1 schedule",
    "what is the schedule for 3bsit-1?",
    "what time is ITL314-18 for 3BSIT-1?",
    "when is ITL314-18 for 3BSIT-1?",
  ];

  for (const query of queries) {
    await t.test(query, async () => {
      const results = await knowledge.search(query);
      assert.equal(results.length, 1);
      assert.equal(results[0].document.id, "schedule-3bsit-1");
    });
  }
});

test("returns structured full schedule data for full-section requests", async () => {
  for (const query of ["sched for 3bsit-1", "3bsit-1 schedule", "what is the schedule for 3bsit-1?"]) {
    const match = await knowledge.findSchedule(query);
    assert.equal(match?.request, "full");
    assert.equal(match?.section, "3BSIT-1");
    assert.equal(match?.entries.length, 6);
  }
});

test("returns only the requested course for a specific schedule lookup", async () => {
  const match = await knowledge.findSchedule("What time is ITL314-18 for 3BSIT-1?");
  assert.equal(match?.request, "specific");
  assert.deepEqual(match?.entries, [{
    section: "3BSIT-1", day: "Saturday", startTime: "10:00 AM", endTime: "1:00 PM",
    courseCode: "ITL314-18", courseName: "System Analysis and Design (Lab)", room: "M108",
  }]);
});

test("resolves a room lookup to a single structured schedule entry", async () => {
  const match = await knowledge.findSchedule("what room is ITL314-18 for 3BSIT-1?");
  assert.equal(match?.entries.length, 1);
  assert.equal(match?.entries[0].room, "M108");
});

test("unknown course codes return an empty specific lookup", async () => {
  const match = await knowledge.findSchedule("what time is ITL999-18 for 3BSIT-1?");
  assert.equal(match?.request, "specific");
  assert.deepEqual(match?.entries, []);
});

test("3BSIT-2 gets its own schedule from the knowledge base, never 3BSIT-1's", async () => {
  const query = "What is the schedule of 3BSIT-2?";
  const match = await knowledge.findSchedule(query);
  assert.equal(match?.section, "3BSIT-2");
  assert.equal(match?.entries.length, 6);
  assert.ok(match?.entries.every((e) => e.section === "3BSIT-2"));
  assert.deepEqual(match?.entries[0], {
    section: "3BSIT-2", day: "Tuesday", startTime: "7:00 AM", endTime: "10:00 AM",
    courseCode: "ITLEL3-18", courseName: "IT Elective 3 (Lab)", room: "M108",
  });
  const [result] = await knowledge.search(query);
  assert.equal(result.document.id, "schedule-3bsit-2");
  assert.equal(requiresVerifiedKnowledge(query), true);
});

test("every 3rd-year BSIT section in the knowledge base has six classes", async () => {
  for (const n of [1, 2, 3, 4, 5, 6]) {
    const match = await knowledge.findSchedule(`schedule for 3BSIT-${n}`);
    assert.equal(match?.entries.length, 6, `3BSIT-${n}`);
    assert.ok(match?.entries.every((e) => e.section === `3BSIT-${n}`));
  }
});

test("3BSIT-5 and 3BSIT-6 have no rooms in the source, so none are invented", async () => {
  for (const section of ["3BSIT-5", "3BSIT-6"]) {
    const match = await knowledge.findSchedule(`schedule for ${section}`);
    assert.ok(match?.entries.every((e) => e.room === ""), section);
    const [result] = await knowledge.search(`schedule for ${section}`);
    assert.match(result.document.content, /Room not listed in the source/);
  }
});

test("a section that is not in the knowledge base gets nothing", async () => {
  const query = "What is the schedule of 3BSIT-7?";
  assert.deepEqual(await knowledge.search(query), []);
  assert.deepEqual((await knowledge.findSchedule(query))?.entries, []);
});

test("leaves general questions such as HTML to the general AI path", async () => {
  const query = "What is HTML?";
  assert.deepEqual(await knowledge.search(query), []);
  assert.equal(requiresVerifiedKnowledge(query), false);
});

test("a cashier question retrieves only the documented cashier location, no person's identity", async () => {
  const query = "Who is the cashier?";
  assert.deepEqual((await knowledge.search(query)).map((r) => r.document.id), ["paying-fees"]);
  assert.equal(requiresVerifiedKnowledge(query), true);
});

test("returns no invented school policy", async () => {
  const query = "Tell me a school policy that isn't in the knowledge base.";
  assert.deepEqual(await knowledge.search(query), []);
  assert.equal(requiresVerifiedKnowledge(query), true);
});

test("rejects requests to invent another section's schedule", async () => {
  const query = "Can you invent the schedule of 3BSIT-2 based on 3BSIT-1?";
  assert.deepEqual(await knowledge.search(query), []);
  assert.deepEqual((await knowledge.findSchedule(query))?.entries, []);
  assert.equal(requiresVerifiedKnowledge(query), true);
});

test("requires an explicit section for schedule and course lookups", async () => {
  for (const query of ["What are my classes on Thursday?", "when is ITL314-18?", "what room is ITL314-18?"]) {
    assert.deepEqual(await knowledge.search(query), []);
    assert.deepEqual((await knowledge.findSchedule(query))?.entries, []);
  }
});

test("never returns 3BSIT-1 when another section is named, and nothing when two sections are named", async () => {
  for (const query of ["sched for 3bsit-2", "ITL314-18 for 3BSIT-2"]) {
    const entries = (await knowledge.findSchedule(query))?.entries ?? [];
    assert.ok(entries.length > 0, query);
    assert.ok(entries.every((e) => e.section === "3BSIT-2"), query);
  }
  assert.deepEqual((await knowledge.findSchedule("ITL314-18 for 3BSIT-2"))?.entries, [{
    section: "3BSIT-2", day: "Saturday", startTime: "7:00 AM", endTime: "10:00 AM",
    courseCode: "ITL314-18", courseName: "System Analysis and Design (Lab)", room: "M102",
  }]);
  const both = "Compare 3BSIT-2 with 3BSIT-1 schedule";
  assert.deepEqual(await knowledge.search(both), []);
  assert.deepEqual((await knowledge.findSchedule(both))?.entries, []);
});
