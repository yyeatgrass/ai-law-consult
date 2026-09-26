import type { VerifiedClause } from "@/lib/schemas";

export function lawViewerHref(lawId: string, target?: { article?: string; quote?: string }) {
  const params = new URLSearchParams();
  if (target?.article) params.set("article", target.article);
  if (target?.quote) params.set("q", target.quote);
  const query = params.toString();
  return `/law/${lawId}${query ? `?${query}` : ""}`;
}

export function lawDownloadHref(lawId: string) {
  return `/api/laws/${lawId}/download`;
}

export function shortLawName(lawName: string) {
  return lawName.replace(/^中华人民共和国/, "").replace(/[《》]/g, "");
}

/**
 * Resolves a free-text reference from a suggestion (e.g. "《治安管理处罚法》第五十一条")
 * to one of the cited clauses. Returns null when the reference is ambiguous or unknown.
 */
export function findClauseForRef(ref: string, clauses: VerifiedClause[]): VerifiedClause | null {
  const normalized = ref.replace(/[《》\s]/g, "");
  const byArticle = clauses.filter((c) => c.article && normalized.includes(c.article));
  const byName = byArticle.filter((c) => normalized.includes(shortLawName(c.lawName)));
  if (byName.length > 0) return byName[0];
  return byArticle.length === 1 ? byArticle[0] : null;
}
