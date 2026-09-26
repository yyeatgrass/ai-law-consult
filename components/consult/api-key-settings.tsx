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
import { emptySettings, loadStoredKeys, maskKey, saveStoredKeys, type KeySettings } from "@/lib/api-keys";
import { SEARCH_PROVIDER_IDS, SEARCH_PROVIDERS, type SearchProviderId } from "@/lib/search/providers";

type ServerConfig = {
  defaultSearchProvider: SearchProviderId;
  serverKeys: { deepseek: boolean; search: Record<SearchProviderId, boolean> };
};

const DEFAULT_CONFIG: ServerConfig = {
  defaultSearchProvider: "tavily",
  serverKeys: { deepseek: false, search: { tavily: false, bocha: false, zhipu: false } },
};

export function ApiKeySettings({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [stored, setStored] = useState<KeySettings>(emptySettings);
  const [draft, setDraft] = useState<KeySettings>(emptySettings);
  const [config, setConfig] = useState<ServerConfig>(DEFAULT_CONFIG);
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
      .then(setConfig)
      .catch(() => {});
  }, []);

  const activeProvider = stored.searchProvider ?? config.defaultSearchProvider;
  const ready =
    Boolean(stored.deepseek || config.serverKeys.deepseek) &&
    Boolean(stored.searchKeys[activeProvider] || config.serverKeys.search[activeProvider]);

  const draftProvider = draft.searchProvider ?? config.defaultSearchProvider;
  const providerInfo = SEARCH_PROVIDERS[draftProvider];

  function save(settings: KeySettings) {
    saveStoredKeys(settings);
    setStored(loadStoredKeys());
    onOpenChange(false);
  }

  function currentStatus(storedKey: string, onServer: boolean) {
    if (storedKey) return `当前：${maskKey(storedKey)}`;
    return onServer ? "当前：使用服务器配置" : "当前：未设置";
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
            className="flex flex-col gap-5"
            onSubmit={(e) => {
              e.preventDefault();
              save({ ...draft, searchProvider: draftProvider });
            }}
          >
            <KeyField
              id="deepseek"
              label="DeepSeek API Key"
              getUrl="https://platform.deepseek.com/api_keys"
              placeholder={config.serverKeys.deepseek ? "服务器已配置，可留空" : "sk-..."}
              hint={`用于分析遭遇、匹配条文和生成建议，账户需有余额。${currentStatus(stored.deepseek, config.serverKeys.deepseek)}`}
              value={draft.deepseek}
              visible={visible}
              onChange={(v) => setDraft((d) => ({ ...d, deepseek: v }))}
            />

            <fieldset className="flex flex-col gap-2">
              <legend className="mb-2 text-sm font-medium">搜索服务</legend>
              <div className="grid grid-cols-3 gap-1 rounded-lg bg-muted p-1" role="radiogroup">
                {SEARCH_PROVIDER_IDS.map((id) => (
                  <button
                    key={id}
                    type="button"
                    role="radio"
                    aria-checked={draftProvider === id}
                    onClick={() => setDraft((d) => ({ ...d, searchProvider: id }))}
                    className={`rounded-md px-2 py-1.5 text-sm transition-colors ${
                      draftProvider === id ? "bg-background font-medium shadow-sm" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {SEARCH_PROVIDERS[id].label}
                    {(stored.searchKeys[id] || config.serverKeys.search[id]) && (
                      <span className="ml-1 inline-block size-1.5 rounded-full bg-emerald-500 align-middle" />
                    )}
                  </button>
                ))}
              </div>
              <KeyField
                id={`search-${draftProvider}`}
                label={`${providerInfo.label} API Key`}
                getUrl={providerInfo.getUrl}
                placeholder={config.serverKeys.search[draftProvider] ? "服务器已配置，可留空" : providerInfo.placeholder}
                hint={`${providerInfo.hint}${currentStatus(stored.searchKeys[draftProvider], config.serverKeys.search[draftProvider])}`}
                value={draft.searchKeys[draftProvider]}
                visible={visible}
                onChange={(v) =>
                  setDraft((d) => ({ ...d, searchKeys: { ...d.searchKeys, [draftProvider]: v } }))
                }
              />
            </fieldset>

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
              disabled={JSON.stringify(stored) === JSON.stringify(emptySettings())}
              onClick={() => save(emptySettings())}
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

function KeyField({
  id,
  label,
  getUrl,
  placeholder,
  hint,
  value,
  visible,
  onChange,
}: {
  id: string;
  label: string;
  getUrl: string;
  placeholder: string;
  hint: string;
  value: string;
  visible: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <Label htmlFor={`key-${id}`}>{label}</Label>
        <a
          href={getUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
        >
          获取 Key <ExternalLink className="size-3" />
        </a>
      </div>
      <Input
        id={`key-${id}`}
        type={visible ? "text" : "password"}
        autoComplete="off"
        spellCheck={false}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      <p className="text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}
