import "server-only";
import { createHash } from "node:crypto";
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { inferLawName, type SourceDoc } from "@/lib/search/clauses";

export type SavedLaw = {
  id: string;
  url: string;
  title: string;
  lawName: string;
  content: string;
  /** True when only the search engine's summary could be saved, not the full page. */
  fromSnippet: boolean;
  savedAt: string;
};

export type SavedLawSummary = Omit<SavedLaw, "content"> & { length: number };

export const LIBRARY_DIR =
  process.env.LAW_LIBRARY_DIR || path.join(/*turbopackIgnore: true*/ process.cwd(), "data", "laws");
const ID_PATTERN = /^[a-f0-9]{16}$/;

export function lawIdForUrl(url: string): string {
  return createHash("sha256").update(url).digest("hex").slice(0, 16);
}

// The library is runtime data, so the bundler must not trace these paths into the build output.
function fileFor(id: string) {
  return path.join(/*turbopackIgnore: true*/ LIBRARY_DIR, `${id}.json`);
}

/** Saves each document and returns url -> law id for the ones that were stored. */
export async function saveLaws(docs: SourceDoc[]): Promise<Map<string, string>> {
  const ids = new Map<string, string>();
  try {
    await mkdir(/*turbopackIgnore: true*/ LIBRARY_DIR, { recursive: true });
  } catch {
    return ids;
  }

  await Promise.all(
    docs.map(async (doc) => {
      const id = lawIdForUrl(doc.url);
      const existing = await getLaw(id);
      const fromSnippet = Boolean(doc.fromSnippet);
      // Never replace a saved full text with a search summary, or a copy with a shorter one.
      const keepExisting =
        existing &&
        (existing.fromSnippet === fromSnippet
          ? existing.content.length >= doc.content.length
          : !existing.fromSnippet);
      if (!keepExisting) {
        const law: SavedLaw = {
          id,
          url: doc.url,
          title: doc.title,
          lawName: inferLawName(doc.title, doc.content),
          content: doc.content,
          fromSnippet,
          savedAt: new Date().toISOString(),
        };
        try {
          await writeFile(/*turbopackIgnore: true*/ fileFor(id), JSON.stringify(law), "utf8");
        } catch {
          return;
        }
      }
      ids.set(doc.url, id);
    }),
  );
  return ids;
}

export async function getLaw(id: string): Promise<SavedLaw | null> {
  if (!ID_PATTERN.test(id)) return null;
  try {
    return JSON.parse(await readFile(/*turbopackIgnore: true*/ fileFor(id), "utf8")) as SavedLaw;
  } catch {
    return null;
  }
}

export async function listLaws(): Promise<SavedLawSummary[]> {
  let files: string[];
  try {
    files = await readdir(/*turbopackIgnore: true*/ LIBRARY_DIR);
  } catch {
    return [];
  }
  const laws = await Promise.all(
    files
      .filter((f) => f.endsWith(".json"))
      .map(async (f) => {
        const law = await getLaw(f.slice(0, -".json".length));
        if (!law) return null;
        const { content, ...meta } = law;
        return { ...meta, length: content.length };
      }),
  );
  return laws
    .filter((l): l is SavedLawSummary => l !== null)
    .sort((a, b) => b.savedAt.localeCompare(a.savedAt));
}
