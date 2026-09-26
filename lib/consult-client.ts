import { KEY_HEADERS, loadStoredKeys } from "@/lib/api-keys";
import type { ConsultRequest, ConsultResult, StageEvent } from "@/lib/schemas";

export class MissingKeysError extends Error {}

type Handlers = {
  onStage: (event: StageEvent) => void;
  onResult: (result: ConsultResult) => void;
};

/** Reads the AI SDK UI message stream (SSE) emitted by /api/consult. */
export async function consult(body: ConsultRequest, handlers: Handlers, signal?: AbortSignal) {
  const keys = loadStoredKeys();
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (keys.deepseek) headers[KEY_HEADERS.deepseek] = keys.deepseek;
  if (keys.tavily) headers[KEY_HEADERS.tavily] = keys.tavily;

  const res = await fetch("/api/consult", {
    method: "POST",
    headers,
    body: JSON.stringify(body),
    signal,
  });
  if (!res.ok || !res.body) {
    const data = await res.json().catch(() => null);
    const message = data?.error ?? `请求失败（${res.status}）`;
    throw data?.code === "missing_keys" ? new MissingKeysError(message) : new Error(message);
  }

  const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
  let buffer = "";
  let gotResult = false;
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += value;
    const events = buffer.split("\n\n");
    buffer = events.pop() ?? "";
    for (const event of events) {
      const line = event.split("\n").find((l) => l.startsWith("data: "));
      if (!line) continue;
      const payload = line.slice("data: ".length);
      if (payload === "[DONE]") continue;
      const chunk = JSON.parse(payload);
      if (chunk.type === "data-stage") handlers.onStage(chunk.data);
      else if (chunk.type === "data-result") {
        gotResult = true;
        handlers.onResult(chunk.data);
      } else if (chunk.type === "error") throw new Error(chunk.errorText);
    }
  }
  if (!gotResult) throw new Error("连接中断，未收到分析结果，请重试。");
}
