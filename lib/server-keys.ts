import "server-only";
import { KEY_HEADERS, type ResolvedKeys } from "@/lib/api-keys";
import { isSearchProviderId, SEARCH_PROVIDER_IDS, SEARCH_PROVIDERS, type SearchProviderId } from "@/lib/search/providers";

export function serverSearchKey(provider: SearchProviderId): string {
  return process.env[SEARCH_PROVIDERS[provider].envVar] ?? "";
}

/** SEARCH_PROVIDER if set, otherwise the first provider with a key in the environment, otherwise Tavily. */
export function defaultSearchProvider(): SearchProviderId {
  const configured = process.env.SEARCH_PROVIDER;
  if (isSearchProviderId(configured)) return configured;
  return SEARCH_PROVIDER_IDS.find((id) => serverSearchKey(id)) ?? "tavily";
}

/** Keys sent by the browser take precedence over server environment variables. */
export function resolveKeys(headers: Headers): ResolvedKeys {
  const requested = headers.get(KEY_HEADERS.searchProvider);
  const searchProvider = isSearchProviderId(requested) ? requested : defaultSearchProvider();
  return {
    deepseek: headers.get(KEY_HEADERS.deepseek)?.trim() || process.env.DEEPSEEK_API_KEY || "",
    searchProvider,
    searchKey: headers.get(KEY_HEADERS.searchKey)?.trim() || serverSearchKey(searchProvider),
  };
}
