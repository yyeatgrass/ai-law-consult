import type { SearchEngine, SearchHit } from "./types";

type ZhipuResponse = {
  search_result?: { title?: string; content?: string; link?: string }[];
  error?: { code?: string; message?: string };
};

// search_domain_filter accepts a single exact host, so one filtered call targets the
// NPC site (full law texts) and one unfiltered call is post-filtered by the caller.
const FILTERED_HOST = "www.npc.gov.cn";
const MAX_QUERY_LENGTH = 70;

export const searchZhipu: SearchEngine = async (query, apiKey) => {
  const [filtered, open] = await Promise.all([
    callZhipu(query, apiKey, FILTERED_HOST),
    callZhipu(query, apiKey),
  ]);
  return [...filtered, ...open];
};

async function callZhipu(query: string, apiKey: string, domain?: string): Promise<SearchHit[]> {
  const res = await fetch("https://open.bigmodel.cn/api/paas/v4/web_search", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      search_engine: "search_pro",
      search_query: query.slice(0, MAX_QUERY_LENGTH),
      search_intent: false,
      count: 15,
      content_size: "high",
      ...(domain && { search_domain_filter: domain }),
    }),
    signal: AbortSignal.timeout(20000),
  });
  const body = (await res.json().catch(() => ({}))) as ZhipuResponse;
  if (!res.ok) throw new Error(`${res.status} ${body.error?.message ?? res.statusText}`);

  return (body.search_result ?? [])
    .filter((r) => r.link)
    .map((r, rank) => ({
      url: r.link!,
      title: r.title ?? "",
      snippet: r.content ?? "",
      score: (domain ? 1 : 0.5) / (rank + 1),
    }));
}
