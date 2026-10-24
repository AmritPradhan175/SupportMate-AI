import { z } from "zod";
import rawKnowledgeBase from "./knowledge-base.json";

/* ---------- Types ---------- */

export interface FaqRecord {
  id: string;
  category: string;
  question: string;
  answer: string;
  keywords: string[];
}

export interface RetrievalOptions {
  /** Minimum score an entry needs to be considered relevant. */
  minScore?: number;
  /** Maximum number of entries returned. */
  maxResults?: number;
  /** Entries scoring below this fraction of the top score are dropped. */
  relativeCutoff?: number;
}

export interface RetrievedFaq {
  faq: FaqRecord;
  /** Raw relevance score (higher is better). */
  score: number;
  /** Score scaled to 0-1 for display and logging. It is a ranking aid, not a probability. */
  normalizedScore: number;
  /** Words from the question that matched this entry. */
  matchedTerms: string[];
}

export interface RetrievalResult {
  query: string;
  queryTerms: string[];
  results: RetrievedFaq[];
  topScore: number;
  minScore: number;
}

export const DEFAULT_MIN_SCORE = 3;
export const DEFAULT_MAX_RESULTS = 3;
export const DEFAULT_RELATIVE_CUTOFF = 0.5;

/* ---------- Knowledge base loading ---------- */

const faqSchema = z.object({
  id: z.string().min(1),
  category: z.string().min(1),
  question: z.string().min(1),
  answer: z.string().min(1),
  keywords: z.array(z.string().min(1)).min(1),
});

const knowledgeBaseSchema = z.object({
  notice: z.string(),
  entries: z.array(faqSchema).min(1),
});

const knowledgeBase = knowledgeBaseSchema.parse(rawKnowledgeBase);

export const KNOWLEDGE_BASE_NOTICE = knowledgeBase.notice;

export function getAllFaqs(): FaqRecord[] {
  return knowledgeBase.entries;
}

/* ---------- Text processing ---------- */

const STOPWORDS = new Set([
  "a", "about", "after", "all", "am", "an", "and", "any", "are", "as", "at", "be", "been", "but", "by",
  "can", "could", "did", "do", "does", "for", "from", "get", "got", "had", "has", "have", "how", "i",
  "if", "in", "into", "is", "it", "its", "long", "me", "much", "my", "need", "of", "on", "or", "our",
  "please", "should", "so", "some", "take", "tell", "than", "that", "the", "their", "them", "then",
  "there", "these", "this", "to", "up", "us", "want", "was", "we", "were", "what", "when", "where",
  "which", "who", "why", "will", "with", "would", "you", "your",
]);

/** Words that appear across many entries and say little about the topic. */
const GENERIC_TERMS = new Set(["order", "product", "item", "account", "status", "price", "cost", "card", "available"]);

export function normalizeText(text: string): string {
  return text
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/['\u2019]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function undouble(word: string): string {
  const last = word.at(-1);
  if (word.length > 2 && last === word.at(-2) && last !== "s" && !(last === "l" && word.length <= 4)) {
    return word.slice(0, -1);
  }
  return word;
}

/** Light suffix stripping so "shipping", "shipped" and "ships" all match "ship". */
export function stem(word: string): string {
  if (word.length <= 3 || /\d/.test(word)) return word;
  if (word.endsWith("ies") && word.length > 4) return `${word.slice(0, -3)}y`;
  if (word.endsWith("sses")) return word.slice(0, -2);
  if (word.endsWith("ing") && word.length > 5) return undouble(word.slice(0, -3));
  if (word.endsWith("ed") && word.length > 4) return undouble(word.slice(0, -2));
  if (/(ch|sh|x)es$/.test(word)) return word.slice(0, -2);
  if (word.endsWith("s") && !word.endsWith("ss")) return word.slice(0, -1);
  return word;
}

/** Normalizes, splits, removes stopwords and stems. Returns unique stems in order of appearance. */
export function tokenize(text: string): string[] {
  const stems = normalizeText(text)
    .split(" ")
    .filter((token) => token.length > 1 && !STOPWORDS.has(token))
    .map(stem);
  return [...new Set(stems)];
}

/** Like tokenize but keeps stopwords, so question wording ("how long ... take") can break ties. */
function tokenizeAll(text: string): Set<string> {
  return new Set(
    normalizeText(text)
      .split(" ")
      .filter((token) => token.length > 0)
      .map(stem),
  );
}

function similarity(a: ReadonlySet<string>, b: ReadonlySet<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let shared = 0;
  for (const token of a) if (b.has(token)) shared += 1;
  return shared / (a.size + b.size - shared);
}

/* ---------- Index ---------- */

interface IndexedFaq {
  faq: FaqRecord;
  keywordStems: Set<string>;
  keywordPhrases: string[];
  questionStems: Set<string>;
  questionAllStems: Set<string>;
  categoryStems: Set<string>;
  answerStems: Set<string>;
}

const indexCache = new WeakMap<readonly FaqRecord[], IndexedFaq[]>();

function buildIndex(records: readonly FaqRecord[]): IndexedFaq[] {
  const cached = indexCache.get(records);
  if (cached) return cached;

  const index = records.map((faq) => ({
    faq,
    keywordStems: new Set(faq.keywords.flatMap(tokenize)),
    keywordPhrases: faq.keywords.map(normalizeText).filter((phrase) => phrase.includes(" ")),
    questionStems: new Set(tokenize(faq.question)),
    questionAllStems: tokenizeAll(faq.question),
    categoryStems: new Set(tokenize(faq.category)),
    answerStems: new Set(tokenize(faq.answer)),
  }));
  indexCache.set(records, index);
  return index;
}

/* ---------- Scoring ---------- */

function containsPhrase(normalizedQuery: string, phrase: string): boolean {
  return ` ${normalizedQuery} `.includes(` ${phrase} `);
}

function scoreRecord(
  entry: IndexedFaq,
  queryStems: readonly string[],
  normalizedQuery: string,
  originalWords: ReadonlyMap<string, string>,
): { score: number; matchedTerms: string[] } {
  let score = 0;
  const matched = new Set<string>();

  for (const term of queryStems) {
    const generic = GENERIC_TERMS.has(term);
    let weight = 0;

    if (entry.keywordStems.has(term)) {
      weight = generic ? 1 : 3;
      if (entry.questionStems.has(term)) weight += generic ? 0.5 : 1;
    } else if (entry.questionStems.has(term)) {
      weight = generic ? 0.5 : 2;
    } else if (entry.categoryStems.has(term)) {
      weight = generic ? 0.25 : 1;
    } else if (entry.answerStems.has(term)) {
      weight = 0.5;
    }

    if (weight > 0) {
      score += weight;
      matched.add(originalWords.get(term) ?? term);
    }
  }

  for (const phrase of entry.keywordPhrases) {
    if (containsPhrase(normalizedQuery, phrase)) {
      score += 3;
      matched.add(phrase);
    }
  }

  return { score, matchedTerms: [...matched] };
}

/* ---------- Public retrieval API ---------- */

/**
 * Deterministic keyword retrieval. A keyword match only means "possibly relevant":
 * callers must still let the model (or a human) decide whether the entry answers the question.
 */
export function retrieveFaqs(
  query: string,
  options: RetrievalOptions = {},
  records: readonly FaqRecord[] = knowledgeBase.entries,
): RetrievalResult {
  const minScore = options.minScore ?? DEFAULT_MIN_SCORE;
  const maxResults = options.maxResults ?? DEFAULT_MAX_RESULTS;
  const relativeCutoff = options.relativeCutoff ?? DEFAULT_RELATIVE_CUTOFF;

  const normalizedQuery = normalizeText(query);
  const queryStems = tokenize(query);
  const queryAllStems = tokenizeAll(query);

  const originalWords = new Map<string, string>();
  for (const word of normalizedQuery.split(" ")) {
    const key = stem(word);
    if (!originalWords.has(key)) originalWords.set(key, word);
  }

  const seen = new Set<string>();
  const scored: RetrievedFaq[] = [];

  for (const entry of buildIndex(records)) {
    if (seen.has(entry.faq.id)) continue;
    seen.add(entry.faq.id);

    const { score: baseScore, matchedTerms } = scoreRecord(entry, queryStems, normalizedQuery, originalWords);
    // The threshold uses the keyword score only; wording similarity (max +1) just orders close results.
    if (baseScore >= minScore) {
      const score = baseScore + similarity(queryAllStems, entry.questionAllStems);
      scored.push({
        faq: entry.faq,
        score: Math.round(score * 100) / 100,
        normalizedScore: Math.min(1, Math.round((score / 10) * 100) / 100),
        matchedTerms,
      });
    }
  }

  scored.sort((a, b) => b.score - a.score || a.faq.id.localeCompare(b.faq.id));

  const topScore = scored[0]?.score ?? 0;
  const results = scored
    .filter((item) => item.score >= topScore * relativeCutoff)
    .slice(0, maxResults);

  return { query, queryTerms: queryStems, results, topScore, minScore };
}
