export type RankableEntry = { slug: string; keywords: readonly string[] };
export type RankedEntry<T> = { entry: T; score: number; matched: string[] };

export const MAX_RANKED_ENTRIES = 3;

function terms(value: string): string[] {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
}

const bySlug = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);

// Equal keyword sets summed in a different order can differ in the last floating-point bit.
const TIE_EPSILON = 1e-9;
const isTie = (a: number, b: number) => Math.abs(a - b) <= TIE_EPSILON;

/**
 * Highest score first; scores within TIE_EPSILON of a group's highest score form one tie group, ordered by
 * slug. Grouping after an exact sort keeps the comparators transitive and the result deterministic.
 */
function orderCandidates<C extends { entry: RankableEntry; score: number }>(candidates: C[]): C[] {
  const byScore = [...candidates].sort((a, b) => b.score - a.score || bySlug(a.entry.slug, b.entry.slug));
  const ordered: C[] = [];
  for (let start = 0; start < byScore.length;) {
    let end = start + 1;
    while (end < byScore.length && isTie(byScore[start].score, byScore[end].score)) end++;
    ordered.push(...byScore.slice(start, end).sort((a, b) => bySlug(a.entry.slug, b.entry.slug)));
    start = end;
  }
  return ordered;
}

/**
 * Ranks entries by keyword matches against the question.
 * - A keyword matches when every word of it appears in the question (any order, whole words only).
 * - Rarer keywords weigh more: words in the keyword × ln(1 + entries / entries-with-that-keyword).
 * - Returns the top entry, entries tied with it, and entries scoring at least 25% of the top that
 *   matched a keyword the top entry did not, capped at three. No match returns [].
 */
export function rankEntries<T extends RankableEntry>(query: string, entries: readonly T[], cap = MAX_RANKED_ENTRIES): RankedEntry<T>[] {
  const queryTerms = new Set(terms(query));
  if (!queryTerms.size || !entries.length || cap < 1) return [];

  const keywordSets = entries.map((entry) => [...new Set(entry.keywords.map((keyword) => terms(keyword).join(" ")).filter(Boolean))]);
  const documentFrequency = new Map<string, number>();
  for (const keywords of keywordSets) for (const keyword of keywords) documentFrequency.set(keyword, (documentFrequency.get(keyword) ?? 0) + 1);

  const scored = orderCandidates(entries
    .map((entry, index) => {
      const matched = keywordSets[index].filter((keyword) => keyword.split(" ").every((term) => queryTerms.has(term)));
      const score = matched.reduce((sum, keyword) => sum + keyword.split(" ").length * Math.log(1 + entries.length / documentFrequency.get(keyword)!), 0);
      return { entry, score, matched };
    })
    .filter((candidate) => candidate.score > 0));
  if (!scored.length) return [];

  const [top, ...rest] = scored;
  const topMatched = new Set(top.matched);
  const related = rest.filter((candidate) =>
    isTie(candidate.score, top.score)
    || (candidate.score >= 0.25 * top.score && candidate.matched.some((keyword) => !topMatched.has(keyword))));
  return [top, ...related].slice(0, cap);
}
