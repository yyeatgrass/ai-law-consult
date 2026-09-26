import { z } from "zod";

export const relationshipEnum = z.enum([
  "school",
  "workplace",
  "neighbor",
  "online",
  "family",
  "consumer",
  "stranger",
  "other",
]);

export const analysisSchema = z.object({
  summary: z.string().describe("用通俗中文复述用户遭遇，2-4句"),
  facts: z.array(z.string()).describe("从描述中提取的关键事实，每条一句"),
  parties: z.array(z.string()).describe("涉及的当事人及其身份，如：用户（初中生）、同班同学"),
  relationship: relationshipEnum,
  legalIssues: z.array(z.string()).describe("可能涉及的法律问题，如：殴打他人、侮辱诽谤、拖欠工资"),
  candidateLaws: z.array(z.string()).describe("可能适用的法律法规全称，如：中华人民共和国治安管理处罚法"),
  searchQueries: z.array(z.string()).min(1).max(6).describe("3-6条中文搜索词，用于在官方法律网站检索相关条文"),
  keywords: z.array(z.string()).describe("用于在条文中匹配的中文关键词，如：殴打、拘留、赔偿、未成年人"),
  clarifyingQuestions: z.array(z.string()).describe("若关键事实缺失（如年龄、是否受伤、时间、有无证据），列出需向用户追问的问题；信息充分则为空数组"),
});
export type Analysis = z.infer<typeof analysisSchema>;

export const mappedClauseSchema = z.object({
  clauseId: z.string().describe("所引用条文的 id，必须来自提供的条文列表"),
  lawName: z.string(),
  article: z.string().describe("条号，如：第四十三条；无条号则为空字符串"),
  quote: z.string().describe("从条文原文中逐字摘录的关键句，不得改写"),
  sourceUrl: z.string(),
  relevance: z.enum(["high", "medium", "low"]),
  howItApplies: z.string().describe("用通俗中文解释该条文如何适用于用户的情况"),
});
export type MappedClause = z.infer<typeof mappedClauseSchema>;

export const mappingSchema = z.object({
  clauses: z.array(mappedClauseSchema),
  gaps: z.array(z.string()).describe("检索到的资料未能覆盖、但可能相关的法律问题"),
});

export type VerifiedClause = MappedClause & { verified: boolean };

export const suggestionSchema = z.object({
  assessment: z.string().describe("对用户处境的整体法律评估，通俗易懂，3-5句"),
  steps: z
    .array(
      z.object({
        title: z.string(),
        detail: z.string(),
        category: z.enum(["evidence", "report", "negotiate", "legal_action", "safety", "other"]),
        relatedArticles: z.array(z.string()).describe("关联的条文，如：治安管理处罚法第四十三条"),
      }),
    )
    .describe("按优先级排序的具体行动建议"),
  contacts: z
    .array(z.object({ name: z.string(), how: z.string() }))
    .describe("可求助的机构及联系方式，如：110 报警、12348 法律援助热线"),
  deadlines: z.array(z.string()).describe("需要注意的时效或期限；无则为空数组"),
  possibleClaims: z.array(z.string()).describe("用户可以主张的权利或赔偿"),
  whenToGetLawyer: z.string(),
});
export type Suggestion = z.infer<typeof suggestionSchema>;

export type ConsultSource = { url: string; title: string };

export type ConsultResult = {
  analysis: Analysis;
  clauses: VerifiedClause[];
  gaps: string[];
  suggestion: Suggestion;
  sources: ConsultSource[];
};

export const stageEnum = z.enum(["analyzing", "searching", "mapping", "suggesting", "done"]);
export type Stage = z.infer<typeof stageEnum>;

export type StageEvent = { stage: Stage; message: string };

export const consultRequestSchema = z.object({
  situation: z.string().trim().min(10, "请至少用 10 个字描述你的遭遇").max(4000),
  answers: z
    .array(z.object({ question: z.string(), answer: z.string() }))
    .max(10)
    .optional(),
});
export type ConsultRequest = z.infer<typeof consultRequestSchema>;
