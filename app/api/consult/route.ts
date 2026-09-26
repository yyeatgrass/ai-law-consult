import { createUIMessageStream, createUIMessageStreamResponse, type UIMessage } from "ai";
import { runConsultation } from "@/lib/pipeline";
import { consultRequestSchema, type ConsultResult, type StageEvent } from "@/lib/schemas";
import { SearchError } from "@/lib/search";
import { SEARCH_PROVIDERS } from "@/lib/search/providers";
import { resolveKeys } from "@/lib/server-keys";

export const maxDuration = 300;

type ConsultMessage = UIMessage<never, { stage: StageEvent; result: ConsultResult }>;

export async function POST(request: Request) {
  const keys = resolveKeys(request.headers);
  const searchLabel = SEARCH_PROVIDERS[keys.searchProvider].label;
  const missing = [!keys.deepseek && "DeepSeek", !keys.searchKey && searchLabel].filter(Boolean);
  if (missing.length) {
    return Response.json(
      { error: `缺少 ${missing.join(" 和 ")} API Key，请点击右上角「设置 API Key」填写。`, code: "missing_keys" },
      { status: 401 },
    );
  }

  const parsed = consultRequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues[0]?.message ?? "请求格式错误" }, { status: 400 });
  }

  const stream = createUIMessageStream<ConsultMessage>({
    execute: async ({ writer }) => {
      const result = await runConsultation(
        parsed.data,
        (event) => writer.write({ type: "data-stage", data: event, transient: true }),
        { keys, abortSignal: request.signal },
      );
      writer.write({ type: "data-stage", data: { stage: "done", message: "分析完成" }, transient: true });
      writer.write({ type: "data-result", data: result });
    },
    onError: (error) => {
      // Provider error messages can echo the API key back, so only log the type and status.
      console.error("[consult]", (rootCause(error) as Error | null)?.name, providerStatus(error));
      return describeError(error);
    },
  });

  return createUIMessageStreamResponse({ stream });
}

function describeError(error: unknown): string {
  if (error instanceof SearchError) {
    const label = SEARCH_PROVIDERS[error.provider].label;
    return `官方法律网站检索失败（${error.message}）。请检查 ${label} API Key 是否正确、余额或额度是否充足，也可以在「设置 API Key」中换一个搜索服务。`;
  }
  const status = providerStatus(error);
  if (status === 401) return "DeepSeek API Key 无效，请点击右上角「设置 API Key」检查后重试。";
  if (status === 402) return "DeepSeek 账户余额不足，请充值后重试。";
  if (status === 429) return "DeepSeek 请求过于频繁，请稍等片刻再试。";
  return "分析过程中出现错误，请稍后重试。如情况紧急，请直接拨打 110 或 12348 法律援助热线。";
}

/** Retryable failures (e.g. 429) arrive wrapped in a RetryError. */
function rootCause(error: unknown): unknown {
  return (error as { lastError?: unknown } | null)?.lastError ?? error;
}

function providerStatus(error: unknown): number | undefined {
  return (rootCause(error) as { statusCode?: number } | null)?.statusCode;
}
