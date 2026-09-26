"use client";

import { useEffect, useRef, useState } from "react";
import { RotateCcwClock, Scale, Send, Trash } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { consult } from "@/lib/consult-client";
import { loadHistory, saveHistory, type HistoryEntry } from "@/lib/history";
import type { ConsultRequest, ConsultResult, Stage } from "@/lib/schemas";
import { ResultView } from "./result-view";
import { StageProgress } from "./stage-progress";

const EXAMPLES = [
  {
    label: "校园欺凌",
    text: "我今年15岁，读初三。班上有几个同学经常在放学路上堵我，抢我的零花钱，上周还把我推倒在地，膝盖擦伤了。我跟班主任说过，但老师只是批评了他们几句，之后他们变本加厉，还在班级群里骂我。",
  },
  {
    label: "职场骚扰",
    text: "我在一家公司做行政，部门主管经常在微信上给我发带有性暗示的消息，还在没人的时候对我动手动脚。我拒绝后他开始在工作上刁难我，扬言要让我试用期不通过。我保留了部分聊天截图。",
  },
  {
    label: "拖欠工资",
    text: "我在一个装修队干了三个月，老板一直说项目款没到，拖着不发工资，一共欠我2万多元。没有签劳动合同，只有微信上的考勤记录和老板承认欠款的语音。现在老板电话也不接了。",
  },
  {
    label: "网络诽谤",
    text: "前同事在抖音和朋友圈发视频，说我偷公司东西、作风不正，配了我的照片和名字，已经有上千人转发，很多熟人来问我，我根本没做过这些事，精神压力非常大。",
  },
];

export function ConsultApp() {
  const [situation, setSituation] = useState("");
  const [busy, setBusy] = useState(false);
  const [stage, setStage] = useState<{ stage: Stage; message: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [active, setActive] = useState<HistoryEntry | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- localStorage is only readable after hydration
    setHistory(loadHistory());
  }, []);

  function updateHistory(next: HistoryEntry[]) {
    setHistory(next);
    saveHistory(next);
  }

  async function run(request: ConsultRequest) {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setBusy(true);
    setError(null);
    setStage({ stage: "analyzing", message: "正在连接…" });

    let result = null as ConsultResult | null;
    try {
      await consult(
        request,
        {
          onStage: setStage,
          onResult: (r) => {
            result = r;
          },
        },
        controller.signal,
      );
      if (result) {
        const entry: HistoryEntry = { id: crypto.randomUUID(), createdAt: Date.now(), request, result };
        setActive(entry);
        updateHistory([entry, ...loadHistory()]);
      }
    } catch (e) {
      if (!controller.signal.aborted) setError(e instanceof Error ? e.message : String(e));
    } finally {
      if (abortRef.current === controller) {
        setBusy(false);
        setStage(null);
      }
    }
  }

  return (
    <div className="mx-auto grid w-full max-w-6xl gap-6 px-4 py-8 lg:grid-cols-[1fr_260px]">
      <main className="flex min-w-0 flex-col gap-5">
        <header className="flex flex-col gap-1">
          <h1 className="flex items-center gap-2 text-2xl font-semibold">
            <Scale className="size-6" /> 法律小帮手
          </h1>
          <p className="text-sm text-muted-foreground">
            说说你遇到了什么事。我会在全国人大、最高法、司法部等官方网站检索相关法律，告诉你法律怎么规定、你可以怎么做。
          </p>
        </header>

        <div className="rounded-lg bg-amber-50 p-3 text-xs text-amber-900 ring-1 ring-amber-200 dark:bg-amber-950/40 dark:text-amber-200 dark:ring-amber-900">
          仅供参考，不构成法律意见。如正在遭遇人身危险请立即拨打 <b>110</b>；需要免费法律帮助可拨打{" "}
          <b>12348</b> 法律援助热线。
        </div>

        <form
          className="flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (situation.trim().length >= 10) run({ situation: situation.trim() });
          }}
        >
          <Textarea
            rows={7}
            value={situation}
            onChange={(e) => setSituation(e.target.value)}
            placeholder="尽量写清楚：发生了什么、谁做的、你和对方是什么关系、持续多久、有没有受伤或损失、手上有哪些证据……"
            className="bg-card text-base"
            maxLength={4000}
          />
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-muted-foreground">试试示例：</span>
            {EXAMPLES.map((ex) => (
              <Button key={ex.label} type="button" size="xs" variant="outline" onClick={() => setSituation(ex.text)}>
                {ex.label}
              </Button>
            ))}
            <Button type="submit" className="ml-auto" disabled={busy || situation.trim().length < 10}>
              <Send /> 开始分析
            </Button>
          </div>
        </form>

        {stage && <StageProgress stage={stage.stage} message={stage.message} />}
        {error && (
          <p className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive" role="alert">
            {error}
          </p>
        )}

        {active && !busy && (
          <ResultView
            key={active.id}
            result={active.result}
            busy={busy}
            onAnswer={(answers) => run({ situation: active.request.situation, answers })}
          />
        )}
      </main>

      <aside className="flex flex-col gap-2">
        <h2 className="flex items-center gap-1.5 text-sm font-medium">
          <RotateCcwClock className="size-4" /> 咨询记录
        </h2>
        <p className="text-xs text-muted-foreground">仅保存在本浏览器中，不会上传。</p>
        {history.length === 0 && <p className="text-xs text-muted-foreground">暂无记录</p>}
        <ul className="flex flex-col gap-1">
          {history.map((h) => (
            <li key={h.id} className="group flex items-start gap-1">
              <button
                type="button"
                onClick={() => {
                  setActive(h);
                  setSituation(h.request.situation);
                }}
                className={`flex-1 rounded-md p-2 text-left text-xs hover:bg-muted ${active?.id === h.id ? "bg-muted" : ""}`}
              >
                <span className="line-clamp-2">{h.result.analysis.summary || h.request.situation}</span>
                <span className="text-muted-foreground">{new Date(h.createdAt).toLocaleString("zh-CN")}</span>
              </button>
              <Button
                size="icon-xs"
                variant="ghost"
                aria-label="删除记录"
                className="opacity-0 group-hover:opacity-100"
                onClick={() => {
                  updateHistory(history.filter((x) => x.id !== h.id));
                  if (active?.id === h.id) setActive(null);
                }}
              >
                <Trash />
              </Button>
            </li>
          ))}
        </ul>
      </aside>
    </div>
  );
}
