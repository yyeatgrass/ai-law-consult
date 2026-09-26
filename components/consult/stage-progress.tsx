import { Circle, CircleCheck, LoaderCircle } from "lucide-react";
import type { Stage } from "@/lib/schemas";

const STAGES: { id: Exclude<Stage, "done">; label: string }[] = [
  { id: "analyzing", label: "理解遭遇" },
  { id: "searching", label: "检索官方法律" },
  { id: "mapping", label: "匹配条文" },
  { id: "suggesting", label: "生成建议" },
];

export function StageProgress({ stage, message }: { stage: Stage; message: string }) {
  const current = stage === "done" ? STAGES.length : STAGES.findIndex((s) => s.id === stage);
  return (
    <div className="flex flex-col gap-3 rounded-xl bg-card p-4 ring-1 ring-foreground/10">
      <ol className="grid grid-cols-4 gap-2 text-xs">
        {STAGES.map((s, i) => (
          <li
            key={s.id}
            className={`flex items-center gap-1.5 ${i <= current ? "text-foreground" : "text-muted-foreground"}`}
          >
            {i < current ? (
              <CircleCheck className="size-4 text-emerald-600" />
            ) : i === current ? (
              <LoaderCircle className="size-4 animate-spin" />
            ) : (
              <Circle className="size-4" />
            )}
            {s.label}
          </li>
        ))}
      </ol>
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}
