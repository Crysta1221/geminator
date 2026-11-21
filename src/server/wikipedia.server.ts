/**
 * Wikipedia API(MediaWiki Action API) を使った無料の事実検索(サーバー専用)。
 * API キー不要で Cloudflare Workers / Bun の両方で動作する。
 */
import type { TopicContext } from "./judge.server";

const WIKIPEDIA_API_ENDPOINT = "https://ja.wikipedia.org/w/api.php";
const WIKIPEDIA_USER_AGENT =
  "Jeminator/1.0 (https://github.com/akinator-decisions; educational quiz app)";
const REQUEST_TIMEOUT_MS = 6000;
const MAX_EXCERPT_CHARS = 10_000;
const INTRO_BUDGET_CHARS = 2_800;

export type WikipediaArticle = {
  title: string;
  url: string;
  extract: string;
  searchQuery: string;
};

type MediaWikiSearchItem = {
  pageid?: number;
  title?: string;
  snippet?: string;
};

type MediaWikiSearchResponse = {
  query?: {
    search?: MediaWikiSearchItem[];
  };
};

type MediaWikiPage = {
  pageid?: number;
  title?: string;
  fullurl?: string;
  extract?: string;
  missing?: string;
};

type MediaWikiExtractResponse = {
  query?: {
    pages?: Record<string, MediaWikiPage>;
  };
};

function isDisambiguation(item: MediaWikiSearchItem): boolean {
  const title = item.title ?? "";
  const snippet = item.snippet ?? "";
  return title.includes("曖昧さ回避") || snippet.includes("曖昧さ回避");
}

/**
 * 検索結果一覧から最も適切な Wikipedia ページを選ぶ。
 * 曖昧さ回避ページは避け、可能ならお題名と一致する記事を優先する。
 */
export function pickBestWikipediaSearchItem(
  items: readonly MediaWikiSearchItem[],
  preferredTitle: string,
): MediaWikiSearchItem | null {
  const valid = items.filter(
    (item) => typeof item.pageid === "number" && Boolean(item.title?.trim()),
  );
  if (valid.length === 0) return null;

  const nonDisambig = valid.filter((item) => !isDisambiguation(item));
  const pool = nonDisambig.length > 0 ? nonDisambig : valid;

  const normalizedPref = preferredTitle.trim().toLowerCase();
  const exact = pool.find((item) => item.title?.trim().toLowerCase() === normalizedPref);
  return exact ?? pool[0] ?? null;
}

const QUESTION_STOP_TOKENS = new Set([
  "ですか",
  "ますか",
  "でしたか",
  "ましたか",
  "でしょうか",
  "ですか？",
  "それ",
  "これ",
  "あれ",
  "もの",
  "こと",
  "とき",
  "ところ",
  "よう",
  "ため",
  "日本",
]);

/**
 * 質問文から Wikipedia 本文との照合用キーワードを抽出する。
 */
export function extractQuestionKeywords(question: string): string[] {
  const matches =
    question.match(/[\p{Script=Han}]{2,}|[\p{Script=Katakana}ー]{2,}|[A-Za-z0-9]{2,}/gu) ?? [];
  const seen = new Set<string>();
  const keywords: string[] = [];
  for (const raw of matches) {
    const token = raw.trim();
    if (!token || QUESTION_STOP_TOKENS.has(token) || seen.has(token)) {
      continue;
    }
    seen.add(token);
    keywords.push(token);
  }
  return keywords;
}

/**
 * Wikipedia の本文から、冒頭概要 + 質問のキーワードに一致する段落を優先して抜粋を作る。
 */
export function buildWikipediaExcerpt(
  extract: string,
  question: string,
  maxChars = MAX_EXCERPT_CHARS,
): string {
  const trimmed = extract.trim();
  if (trimmed.length <= maxChars) {
    return trimmed;
  }

  const paragraphs = trimmed
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);

  const selectedIndices = new Set<number>();
  let total = 0;

  const introBudget = Math.min(INTRO_BUDGET_CHARS, Math.floor(maxChars * 0.4));
  for (let i = 0; i < paragraphs.length; i++) {
    const p = paragraphs[i];
    if (i > 0 && total + p.length + 2 > introBudget) {
      break;
    }
    selectedIndices.add(i);
    total += p.length + 2;
  }

  const keywords = extractQuestionKeywords(question);
  if (keywords.length > 0) {
    const scored = paragraphs
      .map((p, index) => {
        if (selectedIndices.has(index)) return { index, score: 0 };
        const lower = p.toLowerCase();
        let score = 0;
        for (const kw of keywords) {
          if (lower.includes(kw.toLowerCase())) {
            score += 1;
          }
        }
        return { index, score };
      })
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score || a.index - b.index);

    for (const item of scored) {
      const p = paragraphs[item.index];
      if (total + p.length + 2 > maxChars) {
        continue;
      }
      selectedIndices.add(item.index);
      total += p.length + 2;
    }
  }

  for (let i = 0; i < paragraphs.length; i++) {
    if (selectedIndices.has(i)) continue;
    const p = paragraphs[i];
    if (total + p.length + 2 > maxChars) {
      break;
    }
    selectedIndices.add(i);
    total += p.length + 2;
  }

  const ordered = Array.from(selectedIndices)
    .sort((a, b) => a - b)
    .map((i) => paragraphs[i])
    .join("\n\n");

  return ordered.slice(0, maxChars).trim();
}

async function fetchWikipediaJson<T>(params: Record<string, string>): Promise<T> {
  const url = new URL(WIKIPEDIA_API_ENDPOINT);
  url.searchParams.set("format", "json");
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }

  const res = await fetch(url.toString(), {
    headers: {
      Accept: "application/json",
      "User-Agent": WIKIPEDIA_USER_AGENT,
    },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  if (!res.ok) {
    throw new Error(`wikipedia_http_${res.status}`);
  }
  return (await res.json()) as T;
}

async function searchWikipediaItems(query: string): Promise<MediaWikiSearchItem[]> {
  const data = await fetchWikipediaJson<MediaWikiSearchResponse>({
    action: "query",
    list: "search",
    srsearch: query,
    srlimit: "5",
  });
  return data.query?.search ?? [];
}

/**
 * お題に対応する日本語 Wikipedia 記事を検索して本文を取得する。
 */
export async function fetchWikipediaArticle(topic: TopicContext): Promise<WikipediaArticle | null> {
  const primaryQuery = topic.identified.name.trim() || topic.answer.trim();
  if (!primaryQuery) return null;

  const searchQueries: string[] = [primaryQuery];
  const noteHint = topic.notes.replace(/^ジャンル:\s*/, "").trim();
  if (noteHint) {
    searchQueries.push(`${primaryQuery} ${noteHint.slice(0, 40)}`);
  }
  if (topic.answer.trim() && topic.answer.trim() !== primaryQuery) {
    searchQueries.push(topic.answer.trim());
  }

  let chosen: MediaWikiSearchItem | null = null;
  let usedQuery = primaryQuery;

  for (const q of searchQueries) {
    const items = await searchWikipediaItems(q);
    const best = pickBestWikipediaSearchItem(items, primaryQuery);
    if (best && !isDisambiguation(best)) {
      chosen = best;
      usedQuery = q;
      break;
    }
    if (!chosen && best) {
      chosen = best;
      usedQuery = q;
    }
  }

  if (!chosen || typeof chosen.pageid !== "number") {
    return null;
  }

  const extractData = await fetchWikipediaJson<MediaWikiExtractResponse>({
    action: "query",
    pageids: String(chosen.pageid),
    prop: "extracts|info",
    explaintext: "1",
    inprop: "url",
    redirects: "1",
  });

  const pages = extractData.query?.pages ? Object.values(extractData.query.pages) : [];
  const page = pages[0];
  if (!page || page.missing !== undefined || !page.extract?.trim()) {
    return null;
  }

  const title = page.title?.trim() || chosen.title?.trim() || primaryQuery;
  const pageUrl =
    page.fullurl?.trim() || `https://ja.wikipedia.org/wiki/${encodeURIComponent(title)}`;

  return {
    title,
    url: pageUrl,
    extract: page.extract.trim(),
    searchQuery: usedQuery,
  };
}
