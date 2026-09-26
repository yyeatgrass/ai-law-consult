import "server-only";
import type { SourceDoc } from "./clauses";
import { searchBocha } from "./engines/bocha";
import { searchTavily } from "./engines/tavily";
import type { SearchEngine, SearchHit } from "./engines/types";
import { searchZhipu } from "./engines/zhipu";
import { fetchPageText } from "./fetch-page";
import { classifyLawDoc } from "./law-doc";
import { isOfficialUrl, OFFICIAL_DOMAINS } from "./official-domains";
import { SEARCH_PROVIDERS, type SearchProviderId } from "./providers";

export class SearchError extends Error {
  constructor(
    readonly provider: SearchProviderId,
    message: string,
  ) {
    super(message);
  }
}

const ENGINES: Record<SearchProviderId, SearchEngine> = {
  tavily: searchTavily,
  bocha: searchBocha,
  zhipu: searchZhipu,
};

const MAX_DOCS = 8;
/** Extra candidates are fetched because news and commentary pages get filtered out. */
const MAX_CANDIDATES = 16;
const MIN_CONTENT_LENGTH = 200;
const CONCURRENCY = 3;

export async function searchOfficialSources(
  queries: string[],
  { provider, apiKey }: { provider: SearchProviderId; apiKey: string },
): Promise<SourceDoc[]> {
  const engine = ENGINES[provider];
  const responses = await mapWithConcurrency(queries, CONCURRENCY, (q) => engine(q, apiKey, OFFICIAL_DOMAINS));

  const byUrl = new Map<string, SearchHit>();
  for (const res of responses) {
    if (res.status !== "fulfilled") continue;
    for (const hit of res.value) {
      if (!isOfficialUrl(hit.url)) continue;
      const existing = byUrl.get(hit.url);
      if (!existing || hit.score > existing.score) byUrl.set(hit.url, hit);
    }
  }
  if (byUrl.size === 0) {
    const firstError = responses.find((r) => r.status === "rejected");
    if (firstError) {
      const reason = firstError.reason instanceof Error ? firstError.reason.message : String(firstError.reason);
      throw new SearchError(provider, `${SEARCH_PROVIDERS[provider].label}：${reason}`);
    }
  }

  const candidates = [...byUrl.values()].sort((a, b) => b.score - a.score).slice(0, MAX_CANDIDATES);

  // Engines other than Tavily only return summaries, so the full page is downloaded
  // to confirm it is the law text itself and to verify quotes against it.
  const docs = await Promise.all(
    candidates.map(async (hit): Promise<SourceDoc | null> => {
      let content = hit.content && hit.content.length >= MIN_CONTENT_LENGTH ? hit.content : null;
      content ??= await fetchPageText(hit.url);
      if (!content || content.length < MIN_CONTENT_LENGTH) return null;
      const doc = { url: hit.url, title: hit.title, content };
      return classifyLawDoc(doc).ok ? doc : null;
    }),
  );
  return docs.filter((d): d is SourceDoc => d !== null).slice(0, MAX_DOCS);
}

async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>,
): Promise<PromiseSettledResult<R>[]> {
  const results: PromiseSettledResult<R>[] = new Array(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const i = next++;
      try {
        results[i] = { status: "fulfilled", value: await fn(items[i]) };
      } catch (reason) {
        results[i] = { status: "rejected", reason };
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}
