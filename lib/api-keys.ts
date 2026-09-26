import { isSearchProviderId, SEARCH_PROVIDER_IDS, type SearchProviderId } from "@/lib/search/providers";

export type KeySettings = {
  deepseek: string;
  /** null means "use the server default". */
  searchProvider: SearchProviderId | null;
  searchKeys: Record<SearchProviderId, string>;
};

export type ResolvedKeys = {
  deepseek: string;
  searchProvider: SearchProviderId;
  searchKey: string;
};

export const KEY_HEADERS = {
  deepseek: "x-deepseek-api-key",
  searchProvider: "x-search-provider",
  searchKey: "x-search-api-key",
} as const;

const STORAGE_KEY = "law-consult:api-keys";

export function emptySettings(): KeySettings {
  return {
    deepseek: "",
    searchProvider: null,
    searchKeys: Object.fromEntries(SEARCH_PROVIDER_IDS.map((id) => [id, ""])) as Record<SearchProviderId, string>,
  };
}

export function loadStoredKeys(): KeySettings {
  const settings = emptySettings();
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}");
    settings.deepseek = parsed.deepseek ?? "";
    settings.searchProvider = isSearchProviderId(parsed.searchProvider) ? parsed.searchProvider : null;
    for (const id of SEARCH_PROVIDER_IDS) settings.searchKeys[id] = parsed.searchKeys?.[id] ?? "";
    // Settings saved before multiple search providers existed stored the Tavily key at the top level.
    if (typeof parsed.tavily === "string" && parsed.tavily && !parsed.searchKeys) {
      settings.searchKeys.tavily = parsed.tavily;
      settings.searchProvider = "tavily";
    }
  } catch {
    // Fall back to empty settings.
  }
  return settings;
}

export function saveStoredKeys(settings: KeySettings) {
  const trimmed: KeySettings = {
    deepseek: settings.deepseek.trim(),
    searchProvider: settings.searchProvider,
    searchKeys: Object.fromEntries(
      SEARCH_PROVIDER_IDS.map((id) => [id, settings.searchKeys[id].trim()]),
    ) as Record<SearchProviderId, string>,
  };
  const empty = !trimmed.deepseek && !trimmed.searchProvider && SEARCH_PROVIDER_IDS.every((id) => !trimmed.searchKeys[id]);
  if (empty) localStorage.removeItem(STORAGE_KEY);
  else localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
}

export function maskKey(key: string) {
  return key.length <= 8 ? "••••" : `${key.slice(0, 4)}••••${key.slice(-4)}`;
}
