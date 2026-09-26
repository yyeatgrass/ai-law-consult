import { isOfficialUrl } from "./official-domains";

const TIMEOUT_MS = 8000;
const MAX_BYTES = 3 * 1024 * 1024;

const BLOCK_TAGS = "p|div|li|ul|ol|h[1-6]|tr|table|section|article|dd|dt|blockquote|pre|center";
const ENTITIES: Record<string, string> = {
  nbsp: " ",
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  ldquo: "“",
  rdquo: "”",
  lsquo: "‘",
  rsquo: "’",
  mdash: "—",
  ndash: "–",
  hellip: "…",
  middot: "·",
  ensp: " ",
  emsp: "　",
};

/** Downloads an official page and returns its readable text, or null if it can't be used. */
export async function fetchPageText(url: string): Promise<string | null> {
  if (!isOfficialUrl(url)) return null;
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; LawConsult/1.0)", Accept: "text/html" },
      redirect: "follow",
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok || !isOfficialUrl(res.url || url)) return null;
    const contentType = res.headers.get("content-type") ?? "";
    if (contentType && !/html|text\/plain/i.test(contentType)) return null;

    const bytes = new Uint8Array(await res.arrayBuffer());
    if (bytes.byteLength > MAX_BYTES) return null;
    const html = decodeHtml(bytes, contentType);
    return htmlToText(html);
  } catch {
    return null;
  }
}

export function decodeHtml(bytes: Uint8Array, contentType = ""): string {
  const fromHeader = contentType.match(/charset=([\w-]+)/i)?.[1];
  const head = new TextDecoder("latin1").decode(bytes.subarray(0, 4096));
  const fromMeta = head.match(/<meta[^>]+charset=["']?([\w-]+)/i)?.[1];
  const charset = (fromHeader || fromMeta || "utf-8").toLowerCase();
  try {
    return new TextDecoder(charset).decode(bytes);
  } catch {
    return new TextDecoder("utf-8").decode(bytes);
  }
}

export function htmlToText(html: string): string {
  return decodeEntities(
    html
      .replace(/<!--[\s\S]*?-->/g, "")
      .replace(/<(script|style|noscript|head|svg|iframe)\b[\s\S]*?<\/\1>/gi, "")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(new RegExp(`</?(${BLOCK_TAGS})\\b[^>]*>`, "gi"), "\n")
      .replace(/<[^>]+>/g, ""),
  )
    .split("\n")
    .map((line) => line.replace(/[ \t\u00a0]+/g, " ").trim())
    .filter(Boolean)
    .join("\n");
}

function decodeEntities(text: string): string {
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (match, code: string) => {
    if (code[0] === "#") {
      const n = code[1].toLowerCase() === "x" ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10);
      return Number.isFinite(n) && n >= 0 && n <= 0x10ffff ? String.fromCodePoint(n) : match;
    }
    return ENTITIES[code.toLowerCase()] ?? match;
  });
}
