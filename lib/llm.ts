import "server-only";
import { createDeepSeek } from "@ai-sdk/deepseek";
import { generateText, Output } from "ai";
import type { z } from "zod";

const FAST_MODEL = process.env.DEEPSEEK_MODEL || "deepseek-v4-flash";
const REASONING_MODEL = process.env.DEEPSEEK_REASONING_MODEL || "deepseek-v4-pro";

export type LlmContext = { apiKey: string; abortSignal?: AbortSignal };

export async function generateStructured<T>({
  schema,
  instructions,
  prompt,
  reasoning = false,
  ctx,
}: {
  schema: z.ZodType<T>;
  instructions: string;
  prompt: string;
  reasoning?: boolean;
  ctx: LlmContext;
}): Promise<T> {
  const deepseek = createDeepSeek({ apiKey: ctx.apiKey });
  const { output } = await generateText({
    model: deepseek(reasoning ? REASONING_MODEL : FAST_MODEL),
    instructions,
    prompt,
    output: Output.object({ schema }),
    providerOptions: {
      deepseek: { thinking: { type: reasoning ? "enabled" : "disabled" } },
    },
    maxRetries: 2,
    abortSignal: ctx.abortSignal,
  });
  return output as T;
}
