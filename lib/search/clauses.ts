export type Clause = {
  id: string;
  lawName: string;
  /** e.g. "第四十三条"; empty for unstructured passages (news, Q&A pages). */
  article: string;
  text: string;
  sourceUrl: string;
  sourceTitle: string;
};

export type SourceDoc = {
  url: string;
  title: string;
  content: string;
  /** Content is the search engine's summary because the full page couldn't be read. */
  fromSnippet?: boolean;
};

const CN_NUM = "一二三四五六七八九十百千零〇两";
// Anchored to line start so in-text references like "依照本法第二十条的规定" are not treated as headings.
const ARTICLE_HEADING = new RegExp(
  `^[\\s#*>\\-　]*(第[${CN_NUM}]+条(?:之[${CN_NUM}]+)?)[\\s　:：]*`,
  "gm",
);
const LAW_NAME = /(中华人民共和国)?[\u4e00-\u9fa5]{2,30}?(法典|法|条例|规定|办法|解释)/;
const PASSAGE_SIZE = 800;
const MAX_CLAUSE_LENGTH = 2000;

const BOOK_TITLE = /《([^》]{2,40})》/;

// The page title is more reliable than the body, which often links to related laws.
export function inferLawName(title: string, content = ""): string {
  const titleBracketed = title.match(BOOK_TITLE);
  if (titleBracketed) return titleBracketed[1];
  const cleanedTitle = title.split(/[_|｜\-—]/)[0].trim();
  const fromTitle = cleanedTitle.match(LAW_NAME);
  if (fromTitle) return fromTitle[0];
  const contentBracketed = content.slice(0, 500).match(BOOK_TITLE);
  if (contentBracketed) return contentBracketed[1];
  return cleanedTitle || title;
}

export function splitClauses(doc: SourceDoc): Clause[] {
  const lawName = inferLawName(doc.title, doc.content);
  const base = { lawName, sourceUrl: doc.url, sourceTitle: doc.title };
  const headings = [...doc.content.matchAll(ARTICLE_HEADING)];

  if (headings.length === 0) {
    return chunkPassages(doc.content).map((text, i) => ({
      ...base,
      id: `${doc.url}#p${i}`,
      article: "",
      text,
    }));
  }

  const clauses: Clause[] = [];
  const seen = new Set<string>();
  headings.forEach((match, i) => {
    const start = match.index! + match[0].length;
    const end = i + 1 < headings.length ? headings[i + 1].index! : doc.content.length;
    const text = doc.content.slice(start, end).trim().slice(0, MAX_CLAUSE_LENGTH);
    const article = match[1];
    if (!text || seen.has(article)) return;
    seen.add(article);
    clauses.push({ ...base, id: `${doc.url}#${article}`, article, text });
  });
  return clauses;
}

function chunkPassages(content: string): string[] {
  const paragraphs = content.split(/\n+/).map((p) => p.trim()).filter(Boolean);
  const chunks: string[] = [];
  let current = "";
  for (const p of paragraphs) {
    if (current && current.length + p.length > PASSAGE_SIZE) {
      chunks.push(current);
      current = "";
    }
    current = current ? `${current}\n${p}` : p;
  }
  if (current) chunks.push(current);
  return chunks.flatMap((c) =>
    c.length > PASSAGE_SIZE * 2
      ? Array.from({ length: Math.ceil(c.length / PASSAGE_SIZE) }, (_, i) =>
          c.slice(i * PASSAGE_SIZE, (i + 1) * PASSAGE_SIZE),
        )
      : [c],
  );
}

export function rankClauses(
  clauses: Clause[],
  { keywords, candidateLaws }: { keywords: string[]; candidateLaws: string[] },
  maxChars = 24000,
): Clause[] {
  const terms = [...new Set(keywords.map((k) => k.trim()).filter((k) => k.length >= 2))];
  const scored = clauses
    .map((clause) => {
      let score = 0;
      for (const term of terms) {
        const hits = clause.text.split(term).length - 1;
        if (hits > 0) score += Math.min(hits, 3) * term.length;
      }
      if (candidateLaws.some((law) => clause.lawName.includes(stripPrefix(law)))) score *= 1.5;
      if (clause.article) score *= 1.2;
      return { clause, score };
    })
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score);

  const picked: Clause[] = [];
  let total = 0;
  for (const { clause } of scored) {
    if (total + clause.text.length > maxChars) continue;
    picked.push(clause);
    total += clause.text.length;
  }
  return picked;
}

function stripPrefix(law: string) {
  return law.replace(/^中华人民共和国/, "").replace(/[《》]/g, "");
}
