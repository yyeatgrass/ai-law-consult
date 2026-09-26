export type SearchHit = {
  url: string;
  title: string;
  /** Full page text when the engine returns it (Tavily). */
  content?: string;
  /** Engine-provided summary; used when the full page can't be fetched. */
  snippet: string;
  /** Higher is better; only compared between hits from the same engine. */
  score: number;
};

export type SearchEngine = (query: string, apiKey: string, domains: string[]) => Promise<SearchHit[]>;
