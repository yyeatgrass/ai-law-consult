import type { SearchEngine } from "./types";

type BochaPage = { name?: string; url?: string; snippet?: string; summary?: string };
type BochaResponse = {
  code?: number | string;
  msg?: string;
  message?: string;
  data?: { webPages?: { value?: BochaPage[] } };
  webPages?: { value?: BochaPage[] };
};

export const searchBocha: SearchEngine = async (query, apiKey, domains) => {
  const res = await fetch("https://api.bochaai.com/v1/web-search", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query, include: domains.join("|"), summary: true, count: 10 }),
    signal: AbortSignal.timeout(20000),
  });
  const body = (await res.json().catch(() => ({}))) as BochaResponse;
  if (!res.ok || (body.code != null && Number(body.code) !== 200)) {
    throw new Error(`${res.status} ${body.msg ?? body.message ?? res.statusText}`);
  }

  const pages = body.data?.webPages?.value ?? body.webPages?.value ?? [];
  return pages
    .filter((p): p is BochaPage & { url: string } => Boolean(p.url))
    .map((p, rank) => ({
      url: p.url,
      title: p.name ?? "",
      snippet: p.summary || p.snippet || "",
      score: 1 / (rank + 1),
    }));
};
