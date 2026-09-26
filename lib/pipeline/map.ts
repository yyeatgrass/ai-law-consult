import { generateStructured, type LlmContext } from "@/lib/llm";
import { MAP_INSTRUCTIONS } from "@/lib/prompts";
import { mappingSchema, type Analysis, type MappedClause } from "@/lib/schemas";
import type { Clause } from "@/lib/search/clauses";

export async function mapToClauses(
  analysis: Analysis,
  clauses: Clause[],
  ctx: LlmContext,
): Promise<{ clauses: MappedClause[]; gaps: string[] }> {
  if (clauses.length === 0) return { clauses: [], gaps: analysis.legalIssues };

  const clauseList = clauses
    .map(
      (c) =>
        `<clause id="${c.id}" lawName="${c.lawName}" article="${c.article}" sourceUrl="${c.sourceUrl}">\n${c.text}\n</clause>`,
    )
    .join("\n\n");

  const prompt = `用户情况概述：${analysis.summary}

关键事实：
${analysis.facts.map((f, i) => `${i + 1}. ${f}`).join("\n")}

涉及的法律问题：${analysis.legalIssues.join("、")}

检索到的条文：
${clauseList}`;

  return generateStructured({
    schema: mappingSchema,
    instructions: MAP_INSTRUCTIONS,
    prompt,
    reasoning: true,
    ctx,
  });
}
