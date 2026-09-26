import { createUIMessageStream, createUIMessageStreamResponse, type UIMessage } from "ai";
import { runConsultation } from "@/lib/pipeline";
import { consultRequestSchema, type ConsultResult, type StageEvent } from "@/lib/schemas";

export const maxDuration = 300;

type ConsultMessage = UIMessage<never, { stage: StageEvent; result: ConsultResult }>;

export async function POST(request: Request) {
  if (!process.env.DEEPSEEK_API_KEY || !process.env.TAVILY_API_KEY) {
    return Response.json(
      { error: "服务端未配置 DEEPSEEK_API_KEY 或 TAVILY_API_KEY，请参考 .env.example。" },
      { status: 500 },
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
        request.signal,
      );
      writer.write({ type: "data-stage", data: { stage: "done", message: "分析完成" }, transient: true });
      writer.write({ type: "data-result", data: result });
    },
    onError: (error) => {
      console.error("[consult]", error);
      return "分析过程中出现错误，请稍后重试。如情况紧急，请直接拨打 110 或 12348 法律援助热线。";
    },
  });

  return createUIMessageStreamResponse({ stream });
}
