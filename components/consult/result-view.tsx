"use client";

import { useState } from "react";
import { BookOpenCheck, Clock, Download, ExternalLink, Gavel, Phone, ShieldCheck, TriangleAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { findClauseForRef, lawDownloadHref, lawViewerHref } from "@/lib/law-links";
import type { ConsultResult, Suggestion, VerifiedClause } from "@/lib/schemas";

const RELEVANCE_LABEL = { high: "高度相关", medium: "相关", low: "可能相关" } as const;
const CATEGORY_LABEL: Record<Suggestion["steps"][number]["category"], string> = {
  evidence: "保存证据",
  report: "报警/举报",
  negotiate: "沟通协商",
  legal_action: "法律途径",
  safety: "人身安全",
  other: "其他",
};

export function ResultView({
  result,
  onAnswer,
  busy,
}: {
  result: ConsultResult;
  onAnswer: (answers: { question: string; answer: string }[]) => void;
  busy: boolean;
}) {
  const { analysis, clauses, suggestion, gaps, sources } = result;
  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle>你的情况</CardTitle>
          <CardDescription>{analysis.summary}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-1.5">
          {analysis.legalIssues.map((issue) => (
            <Badge key={issue} variant="secondary">
              {issue}
            </Badge>
          ))}
        </CardContent>
      </Card>

      {analysis.clarifyingQuestions.length > 0 && (
        <ClarifyingQuestions questions={analysis.clarifyingQuestions} onSubmit={onAnswer} busy={busy} />
      )}

      <section className="flex flex-col gap-3">
        <h2 className="flex items-center gap-2 text-base font-semibold">
          <Gavel className="size-4" /> 相关法律条文
        </h2>
        {clauses.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            未能在官方网站找到可引用的法律原文（解读、新闻等二手资料已被排除）。建议拨打 12348 法律援助热线获取专业意见。
          </p>
        ) : (
          clauses.map((c, i) => <ClauseCard key={`${c.sourceUrl}-${c.article}-${i}`} clause={c} />)
        )}
        {gaps.length > 0 && (
          <p className="text-xs text-muted-foreground">未检索到条文支撑的问题：{gaps.join("；")}</p>
        )}
      </section>

      <SuggestionView suggestion={suggestion} clauses={clauses} />

      {sources.length > 0 && (
        <Card size="sm">
          <CardHeader>
            <CardTitle>采用的法律原文</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="flex flex-col gap-1 text-xs">
              {sources.map((s) => (
                <li key={s.url} className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <a href={s.url} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                    {s.title || s.url}
                  </a>
                  {s.lawId && (
                    <>
                      <a
                        href={lawViewerHref(s.lawId)}
                        target="_blank"
                        rel="noreferrer"
                        className="text-muted-foreground hover:text-foreground hover:underline"
                      >
                        本地副本
                      </a>
                      <a
                        href={lawDownloadHref(s.lawId)}
                        className="inline-flex items-center gap-0.5 text-muted-foreground hover:text-foreground hover:underline"
                      >
                        <Download className="size-3" /> 下载
                      </a>
                    </>
                  )}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function ClauseCard({ clause }: { clause: VerifiedClause }) {
  return (
    <Card size="sm" className={clause.verified ? undefined : "opacity-80 ring-amber-500/40"}>
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center gap-2">
          《{clause.lawName}》{clause.article}
          <Badge variant="outline">{RELEVANCE_LABEL[clause.relevance]}</Badge>
          {clause.verified ? (
            <Badge className="bg-emerald-600 text-white">
              <ShieldCheck /> 原文已核实
            </Badge>
          ) : (
            <Badge variant="destructive">
              <TriangleAlert /> 未能核实原文，请谨慎参考
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        <blockquote className="border-l-2 border-primary/40 pl-3 text-sm leading-relaxed text-foreground/90">
          {clause.quote}
        </blockquote>
        <p className="text-sm">
          <span className="font-medium">对你意味着：</span>
          {clause.howItApplies}
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <VerifyButton clause={clause} />
          <a
            href={clause.sourceUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
          >
            查看官方网页 <ExternalLink className="size-3" />
          </a>
        </div>
      </CardContent>
    </Card>
  );
}

function VerifyButton({ clause, size = "sm" }: { clause: VerifiedClause; size?: "sm" | "xs" }) {
  if (!clause.lawId) return null;
  return (
    <a
      href={lawViewerHref(clause.lawId, { article: clause.article, quote: clause.quote })}
      target="_blank"
      rel="noreferrer"
      className={buttonVariants({ variant: "outline", size })}
      title="打开本地保存的法律原文，定位到该条并高亮引用的原句"
    >
      <BookOpenCheck /> 核对原文
    </a>
  );
}

function RelatedArticle({ refText, clauses }: { refText: string; clauses: VerifiedClause[] }) {
  const clause = findClauseForRef(refText, clauses);
  if (!clause?.lawId) return <span className="rounded bg-muted px-1.5 py-0.5">{refText}</span>;
  return (
    <a
      href={lawViewerHref(clause.lawId, { article: clause.article, quote: clause.quote })}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-1 rounded bg-muted px-1.5 py-0.5 text-primary hover:bg-primary/10"
      title="打开本地保存的法律原文核对"
    >
      {refText} <BookOpenCheck className="size-3" />
    </a>
  );
}

function SuggestionView({ suggestion, clauses }: { suggestion: Suggestion; clauses: VerifiedClause[] }) {
  const [done, setDone] = useState<Set<number>>(new Set());
  const toggle = (i: number) =>
    setDone((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });

  return (
    <Card>
      <CardHeader>
        <CardTitle>建议你这样做</CardTitle>
        <CardDescription>{suggestion.assessment}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <ol className="flex flex-col gap-3">
          {suggestion.steps.map((step, i) => (
            <li key={i} className="flex gap-3">
              <input
                type="checkbox"
                checked={done.has(i)}
                onChange={() => toggle(i)}
                className="mt-1 size-4 shrink-0 accent-primary"
                aria-label={`标记完成：${step.title}`}
              />
              <div className={done.has(i) ? "text-muted-foreground line-through" : undefined}>
                <div className="flex flex-wrap items-center gap-2 text-sm font-medium">
                  {i + 1}. {step.title}
                  <Badge variant="secondary">{CATEGORY_LABEL[step.category]}</Badge>
                </div>
                <p className="mt-1 text-sm">{step.detail}</p>
                {step.relatedArticles.length > 0 && (
                  <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                    依据：
                    {step.relatedArticles.map((ref) => (
                      <RelatedArticle key={ref} refText={ref} clauses={clauses} />
                    ))}
                  </div>
                )}
              </div>
            </li>
          ))}
        </ol>

        {suggestion.contacts.length > 0 && (
          <div>
            <h3 className="mb-1 flex items-center gap-1.5 text-sm font-medium">
              <Phone className="size-3.5" /> 可以求助
            </h3>
            <ul className="grid gap-1 text-sm sm:grid-cols-2">
              {suggestion.contacts.map((c) => (
                <li key={c.name}>
                  <span className="font-medium">{c.name}</span>：{c.how}
                </li>
              ))}
            </ul>
          </div>
        )}

        {suggestion.deadlines.length > 0 && (
          <div>
            <h3 className="mb-1 flex items-center gap-1.5 text-sm font-medium">
              <Clock className="size-3.5" /> 注意时效
            </h3>
            <ul className="list-disc pl-5 text-sm">
              {suggestion.deadlines.map((d) => (
                <li key={d}>{d}</li>
              ))}
            </ul>
          </div>
        )}

        {suggestion.possibleClaims.length > 0 && (
          <div>
            <h3 className="mb-1 text-sm font-medium">你可以主张的权利</h3>
            <ul className="list-disc pl-5 text-sm">
              {suggestion.possibleClaims.map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ul>
          </div>
        )}

        <p className="rounded-lg bg-muted p-3 text-sm">
          <span className="font-medium">什么时候该找律师：</span>
          {suggestion.whenToGetLawyer}
        </p>
      </CardContent>
    </Card>
  );
}

function ClarifyingQuestions({
  questions,
  onSubmit,
  busy,
}: {
  questions: string[];
  onSubmit: (answers: { question: string; answer: string }[]) => void;
  busy: boolean;
}) {
  const [answers, setAnswers] = useState<string[]>(() => questions.map(() => ""));
  const hasAnswer = answers.some((a) => a.trim());

  return (
    <Card className="ring-amber-500/40">
      <CardHeader>
        <CardTitle>补充几个细节，结论会更准确</CardTitle>
        <CardDescription>以下信息可能会影响适用的法律条文，可选填。</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {questions.map((q, i) => (
          <label key={q} className="flex flex-col gap-1 text-sm">
            {q}
            <Textarea
              rows={2}
              value={answers[i]}
              onChange={(e) => setAnswers((prev) => prev.map((a, j) => (j === i ? e.target.value : a)))}
            />
          </label>
        ))}
        <Button
          className="self-end"
          disabled={!hasAnswer || busy}
          onClick={() => onSubmit(questions.map((question, i) => ({ question, answer: answers[i] })))}
        >
          补充后重新分析
        </Button>
      </CardContent>
    </Card>
  );
}
