import { tavily } from "@tavily/core";
import type { SearchEngine } from "./types";

export const searchTavily: SearchEngine = async (query, apiKey, domains) => {
  const res = await tavily({ apiKey }).search(query, {
    includeDomains: domains,
    searchDepth: "advanced",
    maxResults: 5,
    includeRawContent: "text",
  });
  return res.results.map((r) => ({
    url: r.url,
    title: r.title,
    content: r.rawContent,
    snippet: r.content,
    score: r.score,
  }));
};
