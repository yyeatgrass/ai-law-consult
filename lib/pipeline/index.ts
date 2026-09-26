import type { ResolvedKeys } from "@/lib/api-keys";
import { formatSituation } from "@/lib/prompts";
import type { ConsultRequest, ConsultResult, StageEvent } from "@/lib/schemas";
import { rankClauses, splitClauses } from "@/lib/search/clauses";
import { searchOfficialSources } from "@/lib/search";
import { SEARCH_PROVIDERS } from "@/lib/search/providers";
import { analyzeSituation } from "./analyze";
import { mapToClauses } from "./map";
import { makeSuggestions } from "./suggest";
import { verifyClauses } from "./verify";

export async function runConsultation(
  request: ConsultRequest,
  onStage: (event: StageEvent) => void,
  { keys, abortSignal }: { keys: ResolvedKeys; abortSignal?: AbortSignal },
): Promise<ConsultResult> {
  const situation = formatSituation(request.situation, request.answers);
  const llm = { apiKey: keys.deepseek, abortSignal };

  onStage({ stage: "analyzing", message: "正在理解你的遭遇…" });
  const analysis = await analyzeSituation(situation, llm);
  // Once the user has answered follow-ups, don't block on a second round of questions.
  if (request.answers?.length) analysis.clarifyingQuestions = [];

  onStage({
    stage: "searching",
    message: `正在通过${SEARCH_PROVIDERS[keys.searchProvider].label}检索官方法律网站：${analysis.candidateLaws.slice(0, 3).join("、") || analysis.searchQueries[0]}`,
  });
  const docs = await searchOfficialSources(analysis.searchQueries, {
    provider: keys.searchProvider,
    apiKey: keys.searchKey,
  });
  const allClauses = docs.flatMap(splitClauses);
  const ranked = rankClauses(allClauses, {
    keywords: [...analysis.keywords, ...analysis.legalIssues],
    candidateLaws: analysis.candidateLaws,
  });

  onStage({
    stage: "mapping",
    message: `从 ${docs.length} 个官方页面中找到 ${ranked.length} 条候选条文，正在逐条比对…`,
  });
  const mapping = await mapToClauses(analysis, ranked, llm);
  const clauses = verifyClauses(mapping.clauses, allClauses, docs);

  onStage({ stage: "suggesting", message: "正在根据条文生成行动建议…" });
  const suggestion = await makeSuggestions(analysis, clauses, llm);

  const citedUrls = new Set(clauses.map((c) => c.sourceUrl));
  return {
    analysis,
    clauses,
    gaps: mapping.gaps,
    suggestion,
    sources: docs
      .map((d) => ({ url: d.url, title: d.title }))
      .sort((a, b) => Number(citedUrls.has(b.url)) - Number(citedUrls.has(a.url))),
  };
}
