export type SearchHit = {
  url: string;
  title: string;
  /** Full page text when the engine returns it (Tavily); otherwise the page is downloaded. */
  content?: string;
  /** Higher is better; only compared between hits from the same engine. */
  score: number;
};

export type SearchEngine = (query: string, apiKey: string, domains: string[]) => Promise<SearchHit[]>;
