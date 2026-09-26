import "server-only";
import { tavily } from "@tavily/core";
import type { SourceDoc } from "./clauses";

export const OFFICIAL_DOMAINS = [
  "flk.npc.gov.cn",
  "npc.gov.cn",
  "gov.cn",
  "court.gov.cn",
  "spp.gov.cn",
  "moj.gov.cn",
  "chinacourt.org",
];

export class SearchError extends Error {}

const MAX_DOCS = 8;
const MIN_CONTENT_LENGTH = 200;

export async function searchOfficialSources(queries: string[], apiKey: string): Promise<SourceDoc[]> {
  const client = tavily({ apiKey });
  const responses = await Promise.allSettled(
    queries.map((query) =>
      client.search(query, {
        includeDomains: OFFICIAL_DOMAINS,
        searchDepth: "advanced",
        maxResults: 5,
        includeRawContent: "text",
      }),
    ),
  );

  const byUrl = new Map<string, { url: string; title: string; content?: string; score: number }>();
  for (const res of responses) {
    if (res.status !== "fulfilled") continue;
    for (const r of res.value.results) {
      const existing = byUrl.get(r.url);
      if (!existing || r.score > existing.score) {
        byUrl.set(r.url, { url: r.url, title: r.title, content: r.rawContent, score: r.score });
      }
    }
  }
  if (byUrl.size === 0) {
    const firstError = responses.find((r) => r.status === "rejected");
    if (firstError) {
      const reason = firstError.reason instanceof Error ? firstError.reason.message : String(firstError.reason);
      throw new SearchError(reason);
    }
  }

  const top = [...byUrl.values()].sort((a, b) => b.score - a.score).slice(0, MAX_DOCS);

  const missing = top.filter((d) => !d.content || d.content.length < MIN_CONTENT_LENGTH);
  if (missing.length > 0) {
    try {
      const extracted = await client.extract(
        missing.map((d) => d.url),
        { extractDepth: "advanced", format: "text" },
      );
      for (const r of extracted.results) {
        const doc = byUrl.get(r.url);
        if (doc && r.rawContent) doc.content = r.rawContent;
      }
    } catch {
      // Fall through with whatever content the search already returned.
    }
  }

  return top
    .filter((d) => d.content && d.content.length >= MIN_CONTENT_LENGTH)
    .map((d) => ({ url: d.url, title: d.title, content: d.content! }));
}
