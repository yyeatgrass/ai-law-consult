import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LawViewer, type LawSection, type LocateStatus } from "@/components/law/law-viewer";
import { getLaw } from "@/lib/law-library";
import { locateQuote } from "@/lib/quote";
import { splitClauses } from "@/lib/search/clauses";

export async function generateMetadata({ params }: PageProps<"/law/[id]">): Promise<Metadata> {
  const law = await getLaw((await params).id);
  return { title: law ? `${law.lawName} · 核对原文` : "未找到法律" };
}

export default async function LawPage({ params, searchParams }: PageProps<"/law/[id]">) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const law = await getLaw(id);
  if (!law) notFound();

  const article = typeof query.article === "string" ? query.article : "";
  const quote = typeof query.q === "string" ? query.q : "";

  const sections: LawSection[] = splitClauses(law).map((c) => ({ article: c.article, text: c.text }));
  let targetIndex = article ? sections.findIndex((s) => s.article === article) : -1;
  let status: LocateStatus = article || quote ? "not-found" : "none";

  if (quote) {
    const inTarget = targetIndex >= 0 ? locateQuote(sections[targetIndex].text, quote) : null;
    if (inTarget) {
      sections[targetIndex].highlight = inTarget;
      status = "found";
    } else {
      const elsewhere = sections.findIndex((s) => locateQuote(s.text, quote));
      if (elsewhere >= 0) {
        sections[elsewhere].highlight = locateQuote(sections[elsewhere].text, quote)!;
        status = article ? "quote-elsewhere" : "found";
        targetIndex = elsewhere;
      } else if (targetIndex >= 0) {
        status = "article-only";
      }
    }
  } else if (targetIndex >= 0) {
    status = "article-only";
  }

  return (
    <LawViewer
      law={{
        id: law.id,
        url: law.url,
        lawName: law.lawName,
        savedAt: law.savedAt,
        fromSnippet: law.fromSnippet,
      }}
      sections={sections}
      targetIndex={targetIndex}
      status={status}
      requestedArticle={article}
      hasQuote={Boolean(quote)}
    />
  );
}
