import "server-only";
import { createDeepSeek } from "@ai-sdk/deepseek";
import { generateText, Output } from "ai";
import type { z } from "zod";

const deepseek = createDeepSeek({ apiKey: process.env.DEEPSEEK_API_KEY });

const FAST_MODEL = process.env.DEEPSEEK_MODEL || "deepseek-v4-flash";
const REASONING_MODEL = process.env.DEEPSEEK_REASONING_MODEL || "deepseek-v4-pro";

export async function generateStructured<T>({
  schema,
  instructions,
  prompt,
  reasoning = false,
  abortSignal,
}: {
  schema: z.ZodType<T>;
  instructions: string;
  prompt: string;
  reasoning?: boolean;
  abortSignal?: AbortSignal;
}): Promise<T> {
  const { output } = await generateText({
    model: deepseek(reasoning ? REASONING_MODEL : FAST_MODEL),
    instructions,
    prompt,
    output: Output.object({ schema }),
    providerOptions: {
      deepseek: { thinking: { type: reasoning ? "enabled" : "disabled" } },
    },
    maxRetries: 2,
    abortSignal,
  });
  return output as T;
}
