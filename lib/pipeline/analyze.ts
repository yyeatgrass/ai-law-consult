import { generateStructured } from "@/lib/llm";
import { ANALYZE_INSTRUCTIONS } from "@/lib/prompts";
import { analysisSchema, type Analysis } from "@/lib/schemas";

export function analyzeSituation(situation: string, abortSignal?: AbortSignal): Promise<Analysis> {
  return generateStructured({
    schema: analysisSchema,
    instructions: ANALYZE_INSTRUCTIONS,
    prompt: `用户描述：\n${situation}`,
    abortSignal,
  });
}
