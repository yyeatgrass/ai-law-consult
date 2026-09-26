/**
 * Quote matching ignores whitespace, punctuation, symbols and full-/half-width differences,
 * so model quotes that differ only in punctuation still match the source text.
 */
function normalizeChar(ch: string): string {
  return ch.normalize("NFKC").replace(/[\s\p{P}\p{S}]/gu, "");
}

export function normalizeText(text: string): string {
  let out = "";
  for (const ch of text) out += normalizeChar(ch);
  return out;
}

/** Returns the [start, end) range of `quote` in `text` using the loose matching above. */
export function locateQuote(text: string, quote: string): { start: number; end: number } | null {
  const target = normalizeText(quote);
  if (!target) return null;

  let normalized = "";
  const origin: number[] = [];
  const widths: number[] = [];
  let offset = 0;
  for (const ch of text) {
    for (const n of normalizeChar(ch)) {
      normalized += n;
      origin.push(offset);
      widths.push(ch.length);
    }
    offset += ch.length;
  }

  const at = normalized.indexOf(target);
  if (at === -1) return null;
  const last = at + target.length - 1;
  return { start: origin[at], end: origin[last] + widths[last] };
}
