import { generateStructured, type LlmContext } from "@/lib/llm";
import { SUGGEST_INSTRUCTIONS } from "@/lib/prompts";
import { suggestionSchema, type Analysis, type Suggestion, type VerifiedClause } from "@/lib/schemas";

export function makeSuggestions(
  analysis: Analysis,
  clauses: VerifiedClause[],
  ctx: LlmContext,
): Promise<Suggestion> {
  const verified = clauses.filter((c) => c.verified);
  const clauseText = verified.length
    ? verified
        .map((c) => `- 《${c.lawName}》${c.article}：${c.quote}\n  适用说明：${c.howItApplies}`)
        .join("\n")
    : "（未检索到可核实的条文，请仅给出通用的求助与证据保全建议，并提示用户咨询 12348 法律援助热线）";

  const prompt = `用户情况概述：${analysis.summary}
场景：${analysis.relationship}
关键事实：
${analysis.facts.map((f, i) => `${i + 1}. ${f}`).join("\n")}

已核实的法律条文：
${clauseText}`;

  return generateStructured({
    schema: suggestionSchema,
    instructions: SUGGEST_INSTRUCTIONS,
    prompt,
    ctx,
  });
}
