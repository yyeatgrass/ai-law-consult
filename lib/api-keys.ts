export type ApiKeys = { deepseek: string; tavily: string };

export const KEY_HEADERS = {
  deepseek: "x-deepseek-api-key",
  tavily: "x-tavily-api-key",
} as const;

const STORAGE_KEY = "law-consult:api-keys";

export function loadStoredKeys(): ApiKeys {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}");
    return { deepseek: parsed.deepseek ?? "", tavily: parsed.tavily ?? "" };
  } catch {
    return { deepseek: "", tavily: "" };
  }
}

export function saveStoredKeys(keys: ApiKeys) {
  const trimmed = { deepseek: keys.deepseek.trim(), tavily: keys.tavily.trim() };
  if (!trimmed.deepseek && !trimmed.tavily) localStorage.removeItem(STORAGE_KEY);
  else localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
}

export function maskKey(key: string) {
  return key.length <= 8 ? "••••" : `${key.slice(0, 4)}••••${key.slice(-4)}`;
}
