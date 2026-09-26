import { normalizeText } from "@/lib/quote";
import type { Clause, SourceDoc } from "@/lib/search/clauses";
import type { MappedClause, VerifiedClause } from "@/lib/schemas";

const MIN_QUOTE_LENGTH = 8;

/**
 * Re-anchors each mapped clause to the retrieved source text. Metadata (law name,
 * article, URL) is taken from the retrieved clause rather than the model output.
 */
export function verifyClauses(
  mapped: MappedClause[],
  clauses: Clause[],
  docs: SourceDoc[],
): VerifiedClause[] {
  const byId = new Map(clauses.map((c) => [c.id, c]));
  const normalizedDocs = docs.map((d) => ({ doc: d, text: normalizeText(d.content) }));
  const results: VerifiedClause[] = [];
  const seen = new Set<string>();

  for (const item of mapped) {
    const quote = normalizeText(item.quote);
    const quoteUsable = quote.length >= MIN_QUOTE_LENGTH;
    const source = byId.get(item.clauseId);

    if (source && quoteUsable && normalizeText(source.text).includes(quote)) {
      pushUnique({
        ...item,
        lawName: source.lawName,
        article: source.article,
        sourceUrl: source.sourceUrl,
        verified: true,
      });
      continue;
    }

    const containing = quoteUsable ? normalizedDocs.find((d) => d.text.includes(quote)) : undefined;
    if (containing) {
      pushUnique({ ...item, sourceUrl: containing.doc.url, verified: true });
      continue;
    }

    pushUnique({ ...item, verified: false });
  }

  return results.sort((a, b) => Number(b.verified) - Number(a.verified));

  function pushUnique(clause: VerifiedClause) {
    const key = `${clause.sourceUrl}|${clause.article}|${normalizeText(clause.quote)}`;
    if (seen.has(key)) return;
    seen.add(key);
    results.push(clause);
  }
}
