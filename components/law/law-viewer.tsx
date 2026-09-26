"use client";

import { useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, CircleCheck, Download, ExternalLink, TriangleAlert } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { lawDownloadHref } from "@/lib/law-links";

export type LawSection = {
  /** Empty for pages without article headings. */
  article: string;
  text: string;
  highlight?: { start: number; end: number };
};

export type LocateStatus = "none" | "found" | "article-only" | "quote-elsewhere" | "not-found";

type Props = {
  law: { id: string; url: string; lawName: string; savedAt: string };
  sections: LawSection[];
  targetIndex: number;
  status: LocateStatus;
  requestedArticle: string;
  hasQuote: boolean;
};

const anchorId = (i: number) => `section-${i}`;

export function LawViewer({ law, sections, targetIndex, status, requestedArticle, hasQuote }: Props) {
  useEffect(() => {
    if (targetIndex < 0) return;
    document.getElementById(anchorId(targetIndex))?.scrollIntoView({ block: "center" });
  }, [targetIndex]);

  const target = targetIndex >= 0 ? sections[targetIndex] : null;
  const hasArticles = sections.some((s) => s.article);

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-4 py-6">
      <header className="sticky top-0 z-10 -mx-4 flex flex-col gap-3 border-b bg-background/95 px-4 py-3 backdrop-blur">
        <Link href="/" className="inline-flex w-fit items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-3" /> 返回咨询
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="flex flex-col gap-1">
            <h1 className="text-xl font-semibold">{law.lawName}</h1>
            <p className="text-xs text-muted-foreground">
              本地副本保存于 {new Date(law.savedAt).toLocaleString("zh-CN")}，法律可能已修订，请以官方网页为准。
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <a href={lawDownloadHref(law.id)} className={buttonVariants({ variant: "outline", size: "sm" })}>
              <Download /> 下载 TXT
            </a>
            <a
              href={law.url}
              target="_blank"
              rel="noreferrer"
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              <ExternalLink /> 查看官方网页
            </a>
          </div>
        </div>
        {hasArticles && sections.length > 1 && (
          <select
            aria-label="跳转到条文"
            className="w-fit rounded-md border bg-background px-2 py-1 text-sm"
            defaultValue=""
            onChange={(e) => {
              document.getElementById(anchorId(Number(e.target.value)))?.scrollIntoView({ block: "start" });
            }}
          >
            <option value="" disabled>
              跳转到条文…
            </option>
            {sections.map((s, i) =>
              s.article ? (
                <option key={i} value={i}>
                  {s.article}
                </option>
              ) : null,
            )}
          </select>
        )}
      </header>

      <StatusBanner
        status={status}
        requestedArticle={requestedArticle}
        foundArticle={target?.article ?? ""}
        hasQuote={hasQuote}
      />

      <article className="flex flex-col gap-1">
        {sections.map((s, i) => (
          <section
            key={i}
            id={anchorId(i)}
            className={`scroll-mt-40 rounded-lg px-3 py-2 text-[15px] leading-7 ${
              i === targetIndex ? "bg-amber-50 ring-2 ring-amber-400 dark:bg-amber-950/30" : ""
            }`}
          >
            {s.article && <span className="mr-2 font-semibold">{s.article}</span>}
            <span className="whitespace-pre-wrap">
              <HighlightedText text={s.text} highlight={s.highlight} />
            </span>
          </section>
        ))}
      </article>
    </div>
  );
}

function HighlightedText({ text, highlight }: { text: string; highlight?: { start: number; end: number } }) {
  if (!highlight) return text;
  return (
    <>
      {text.slice(0, highlight.start)}
      <mark className="rounded bg-yellow-300 px-0.5 text-foreground dark:bg-yellow-600">
        {text.slice(highlight.start, highlight.end)}
      </mark>
      {text.slice(highlight.end)}
    </>
  );
}

function StatusBanner({
  status,
  requestedArticle,
  foundArticle,
  hasQuote,
}: {
  status: LocateStatus;
  requestedArticle: string;
  foundArticle: string;
  hasQuote: boolean;
}) {
  const where = foundArticle || "对应段落";
  switch (status) {
    case "none":
      return null;
    case "found":
      return (
        <Banner tone="ok">
          已定位到{where}
          {hasQuote ? "，黄色高亮部分就是分析结果中引用的原句" : ""}。请逐字比对，确认条文内容与分析结果一致。
        </Banner>
      );
    case "article-only":
      return hasQuote ? (
        <Banner tone="warn">
          已找到{requestedArticle}，但分析结果中引用的原句没有在该条中找到。请阅读条文全文，自行判断是否与你的情况相符。
        </Banner>
      ) : (
        <Banner tone="ok">已定位到{requestedArticle}。</Banner>
      );
    case "quote-elsewhere":
      return (
        <Banner tone="warn">
          引用的原句实际位于{where}
          {requestedArticle ? `，而不是分析结果标注的${requestedArticle}` : ""}。已为你定位到{where}，请注意核对条号。
        </Banner>
      );
    case "not-found":
      return (
        <Banner tone="error">
          在保存的原文中没有找到{requestedArticle || "该条文"}及引用的原句，分析结果可能有误，请谨慎参考，并点击「查看官方网页」核对。
        </Banner>
      );
  }
}

function Banner({ tone, children }: { tone: "ok" | "warn" | "error"; children: React.ReactNode }) {
  const styles = {
    ok: "bg-emerald-50 text-emerald-900 ring-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-200 dark:ring-emerald-900",
    warn: "bg-amber-50 text-amber-900 ring-amber-200 dark:bg-amber-950/40 dark:text-amber-200 dark:ring-amber-900",
    error: "bg-red-50 text-red-900 ring-red-200 dark:bg-red-950/40 dark:text-red-200 dark:ring-red-900",
  }[tone];
  const Icon = tone === "ok" ? CircleCheck : TriangleAlert;
  return (
    <div className={`flex gap-2 rounded-lg p-3 text-sm ring-1 ${styles}`} role="status">
      <Icon className="mt-0.5 size-4 shrink-0" />
      <p>{children}</p>
    </div>
  );
}

