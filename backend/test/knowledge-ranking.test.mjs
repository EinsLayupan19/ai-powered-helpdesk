import assert from "node:assert/strict";
import test from "node:test";
import { MAX_RANKED_ENTRIES, rankEntries } from "../dist/services/knowledge/ranking.js";

// Keywords mirror supabase/seed/knowledge_entries_v1.sql.
const firstTime = { slug: "student-id-first-time", keywords: ["student id", "school id", "id card", "get id", "new id", "request id", "claim id", "id form"] };
const replacement = { slug: "student-id-replacement", keywords: ["student id", "school id", "id card", "lost", "lose", "losing", "lost id", "replacement", "replace", "replacement id", "affidavit of loss"] };
const cashier = { slug: "unrelated-cashier", keywords: ["cashier", "pay", "tuition", "fees"] };
const slugs = (query, entries) => rankEntries(query, entries).map((ranked) => ranked.entry.slug);

test("approved question table (two seed entries)", async (t) => {
  const cases = [
    ["How can I get a replacement school ID?", ["student-id-replacement", "student-id-first-time"]],
    ["What should I do if I lose my student ID?", ["student-id-replacement"]],
    ["I lost my student ID", ["student-id-replacement"]],
    ["How do I replace my ID?", ["student-id-replacement"]],
    ["Where do I submit the affidavit of loss?", ["student-id-replacement"]],
    ["How can I get my student ID?", ["student-id-first-time"]],
    ["How do I get a new ID?", ["student-id-first-time"]],
    ["Where do I claim my ID?", ["student-id-first-time"]],
    ["What is my student ID number?", ["student-id-first-time", "student-id-replacement"]],
    ["Can I get a new ID after losing mine?", ["student-id-first-time", "student-id-replacement"]],
    ["What is HTML?", []],
    ["Who is the cashier?", []],
  ];
  for (const [query, expected] of cases) await t.test(query, () => assert.deepEqual(slugs(query, [firstTime, replacement]), expected));
});

test("the most specific entry ranks first when both ID entries are returned", () => {
  assert.equal(slugs("How can I get a replacement school ID?", [firstTime, replacement])[0], "student-id-replacement");
});

test("irrelevant entries never ride along with ID questions", () => {
  for (const query of ["How can I get a replacement school ID?", "I lost my student ID", "How can I get my student ID?", "What is my student ID number?"]) {
    assert.ok(!slugs(query, [firstTime, replacement, cashier]).includes("unrelated-cashier"), query);
  }
  assert.deepEqual(slugs("Who is the cashier?", [firstTime, replacement, cashier]), ["unrelated-cashier"]);
  assert.deepEqual(slugs("I lost my ID, do I pay the cashier?", [firstTime, replacement, cashier]), ["student-id-replacement", "unrelated-cashier"]);
});

test("overlapping keywords: an entry whose matches are a subset of the top entry's is dropped", () => {
  const general = { slug: "a-general", keywords: ["student id"] };
  const specific = { slug: "b-specific", keywords: ["student id", "lost"] };
  assert.deepEqual(slugs("I lost my student ID", [general, specific]), ["b-specific"]);
});

test("ambiguous queries: entries with distinct matched keywords are all kept", () => {
  const a = { slug: "a", keywords: ["library card"] };
  const b = { slug: "b", keywords: ["parking permit"] };
  assert.deepEqual(slugs("Do I need a library card or a parking permit?", [a, b]), ["a", "b"]);
});

test("ties are kept together, in stable slug order", () => {
  const b = { slug: "b-entry", keywords: ["enrollment"] };
  const a = { slug: "a-entry", keywords: ["enrollment"] };
  assert.deepEqual(slugs("enrollment help", [b, a]), ["a-entry", "b-entry"]);
});

test("caps results at three even when more entries tie", () => {
  assert.equal(MAX_RANKED_ENTRIES, 3);
  const entries = ["e", "d", "c", "b", "a"].map((slug) => ({ slug, keywords: ["clearance"] }));
  assert.deepEqual(slugs("clearance", entries), ["a", "b", "c"]);
});

test("a complementary entry below 25% of the top score is excluded; one above is kept", () => {
  const top = { slug: "top", keywords: ["one two three four five six"] }; // 6 words, unique
  const weak = { slug: "weak", keywords: ["seven"] }; // 1/6 of the top score
  const fair = { slug: "fair", keywords: ["seven eight"] }; // 2/6 of the top score
  const query = "one two three four five six seven eight";
  assert.deepEqual(slugs(query, [top, weak]), ["top"]);
  assert.deepEqual(slugs(query, [top, fair]), ["top", "fair"]);
});

test("rarer keywords outweigh common ones", () => {
  const common = Array.from({ length: 4 }, (_, i) => ({ slug: `common-${i}`, keywords: ["id"] }));
  const rare = { slug: "rare", keywords: ["affidavit"] };
  const ranked = rankEntries("id affidavit", [...common, rare]);
  assert.equal(ranked[0].entry.slug, "rare");
  assert.ok(ranked[0].score > ranked[1].score);
});

test("matching is whole-word and order-independent", () => {
  assert.deepEqual(slugs("id lost, what now", [replacement]), ["student-id-replacement"]); // "lost id" in any order
  assert.deepEqual(slugs("What is my identity?", [firstTime, replacement]), []); // "identity" is not "id"
  assert.deepEqual(slugs("I have a lostid problem", [replacement]), []);
});

test("normalizes case, accents, and punctuation in the question", () => {
  assert.deepEqual(slugs("HOW CAN I GET A REPLACEMENT SCHOOL ID???", [firstTime, replacement])[0], "student-id-replacement");
  assert.deepEqual(slugs("Réplacement for my school-ID", [firstTime, replacement])[0], "student-id-replacement");
});

test("returns nothing for empty input, empty corpus, or entries without keywords", () => {
  assert.deepEqual(rankEntries("", [firstTime]), []);
  assert.deepEqual(rankEntries("   ?!  ", [firstTime]), []);
  assert.deepEqual(rankEntries("student id", []), []);
  assert.deepEqual(rankEntries("student id", [{ slug: "empty", keywords: [] }]), []);
});

// The same multi-keyword set summed in different orders is mathematically equal but can differ in the
// last floating-point bit. Ties must still be ordered by slug, and the cap must keep the slug-first three.
const permutations = (items) => items.length <= 1 ? [items] : items.flatMap((item, i) => permutations([...items.slice(0, i), ...items.slice(i + 1)]).map((rest) => [item, ...rest]));
const TIE_KEYWORDS = ["alpha", "beta gamma", "delta", "epsilon zeta eta", "theta"];
const TIE_QUERY = "alpha beta gamma delta epsilon zeta eta theta";
const TIE_FILLER = [{ slug: "m-filler", keywords: ["beta gamma", "theta"] }, { slug: "n-filler", keywords: ["alpha"] }];

test("floating-point near-ties on multi-keyword entries are ordered by slug", () => {
  let floatDifferences = 0;
  for (const order of permutations(TIE_KEYWORDS)) {
    const ranked = rankEntries(TIE_QUERY, [{ slug: "b-entry", keywords: order }, { slug: "a-entry", keywords: TIE_KEYWORDS }, ...TIE_FILLER]);
    const [a, b] = ["a-entry", "b-entry"].map((slug) => ranked.find((r) => r.entry.slug === slug));
    if (a.score !== b.score) floatDifferences++;
    assert.ok(Math.abs(a.score - b.score) <= 1e-9, `scores should be mathematically equal: ${a.score} vs ${b.score}`);
    assert.deepEqual(ranked.slice(0, 2).map((r) => r.entry.slug), ["a-entry", "b-entry"], `keyword order ${JSON.stringify(order)}`);
  }
  assert.ok(floatDifferences > 0, "fixture must actually produce last-bit float differences");
});

test("the three-entry cap keeps the slug-first entries among floating-point near-ties", () => {
  for (const order of permutations(TIE_KEYWORDS)) {
    const entries = [
      { slug: "d-entry", keywords: TIE_KEYWORDS }, { slug: "c-entry", keywords: order },
      { slug: "b-entry", keywords: [...order].reverse() }, { slug: "a-entry", keywords: order }, ...TIE_FILLER,
    ];
    const ranked = rankEntries(TIE_QUERY, entries);
    assert.equal(ranked.length, 3);
    assert.deepEqual(ranked.map((r) => r.entry.slug), ["a-entry", "b-entry", "c-entry"], `keyword order ${JSON.stringify(order)}`);
  }
});

test("reports score and matched keywords", () => {
  const [ranked] = rankEntries("I lost my student ID", [firstTime, replacement]);
  assert.equal(ranked.entry.slug, "student-id-replacement");
  assert.ok(ranked.score > 0);
  assert.deepEqual([...ranked.matched].sort(), ["lost", "lost id", "student id"]);
});
