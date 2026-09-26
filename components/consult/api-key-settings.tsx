"use client";

import { useEffect, useState } from "react";
import { ExternalLink, Eye, EyeOff, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { loadStoredKeys, maskKey, saveStoredKeys, type ApiKeys } from "@/lib/api-keys";

type Provider = keyof ApiKeys;
type ServerKeys = Record<Provider, boolean>;

const PROVIDERS: { id: Provider; label: string; placeholder: string; getUrl: string; hint: string }[] = [
  {
    id: "deepseek",
    label: "DeepSeek API Key",
    placeholder: "sk-...",
    getUrl: "https://platform.deepseek.com/api_keys",
    hint: "用于分析遭遇、匹配条文和生成建议。账户需有余额。",
  },
  {
    id: "tavily",
    label: "Tavily API Key",
    placeholder: "tvly-...",
    getUrl: "https://app.tavily.com",
    hint: "用于在官方法律网站检索条文，免费额度即可使用。",
  },
];

export function ApiKeySettings({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [stored, setStored] = useState<ApiKeys>({ deepseek: "", tavily: "" });
  const [draft, setDraft] = useState<ApiKeys>({ deepseek: "", tavily: "" });
  const [serverKeys, setServerKeys] = useState<ServerKeys>({ deepseek: false, tavily: false });
  const [visible, setVisible] = useState(false);
  const [wasOpen, setWasOpen] = useState(open);

  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setDraft(stored);
      setVisible(false);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- localStorage is only readable after hydration
    setStored(loadStoredKeys());
    fetch("/api/config")
      .then((r) => r.json())
      .then((d) => setServerKeys(d.serverKeys))
      .catch(() => {});
  }, []);

  const ready = PROVIDERS.every((p) => stored[p.id] || serverKeys[p.id]);

  function save(keys: ApiKeys) {
    saveStoredKeys(keys);
    setStored(loadStoredKeys());
    onOpenChange(false);
  }

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => onOpenChange(true)}>
        <KeyRound />
        设置 API Key
        <span
          className={`size-2 rounded-full ${ready ? "bg-emerald-500" : "bg-amber-500"}`}
          aria-label={ready ? "已配置" : "未配置"}
        />
      </Button>

      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>设置 API Key</DialogTitle>
            <DialogDescription>
              Key 只保存在你当前的浏览器中，仅在分析时随请求发送给本应用的服务器，不会上传到其他地方。
            </DialogDescription>
          </DialogHeader>

          <form
            id="api-key-form"
            className="flex flex-col gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              save(draft);
            }}
          >
            {PROVIDERS.map((p) => (
              <div key={p.id} className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor={`key-${p.id}`}>{p.label}</Label>
                  <a
                    href={p.getUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                  >
                    获取 Key <ExternalLink className="size-3" />
                  </a>
                </div>
                <Input
                  id={`key-${p.id}`}
                  type={visible ? "text" : "password"}
                  autoComplete="off"
                  spellCheck={false}
                  placeholder={serverKeys[p.id] ? "服务器已配置，可留空" : p.placeholder}
                  value={draft[p.id]}
                  onChange={(e) => setDraft((d) => ({ ...d, [p.id]: e.target.value }))}
                />
                <p className="text-xs text-muted-foreground">
                  {p.hint}
                  {stored[p.id] ? ` 当前：${maskKey(stored[p.id])}` : serverKeys[p.id] ? " 当前：使用服务器配置" : " 当前：未设置"}
                </p>
              </div>
            ))}
            <Button
              type="button"
              variant="ghost"
              size="xs"
              className="self-start"
              onClick={() => setVisible((v) => !v)}
            >
              {visible ? <EyeOff /> : <Eye />}
              {visible ? "隐藏" : "显示"} Key
            </Button>
          </form>

          <DialogFooter>
            <Button
              variant="ghost"
              className="sm:mr-auto"
              disabled={!stored.deepseek && !stored.tavily}
              onClick={() => save({ deepseek: "", tavily: "" })}
            >
              清除已保存的 Key
            </Button>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              取消
            </Button>
            <Button type="submit" form="api-key-form">
              保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
