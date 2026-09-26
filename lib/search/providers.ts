export const SEARCH_PROVIDER_IDS = ["tavily", "bocha", "zhipu"] as const;
export type SearchProviderId = (typeof SEARCH_PROVIDER_IDS)[number];

export const SEARCH_PROVIDERS: Record<
  SearchProviderId,
  { label: string; envVar: string; placeholder: string; getUrl: string; hint: string }
> = {
  tavily: {
    label: "Tavily",
    envVar: "TAVILY_API_KEY",
    placeholder: "tvly-...",
    getUrl: "https://app.tavily.com",
    hint: "海外服务，每月约 1000 次免费额度，直接返回网页全文。",
  },
  bocha: {
    label: "博查",
    envVar: "BOCHA_API_KEY",
    placeholder: "sk-...",
    getUrl: "https://open.bochaai.com",
    hint: "国内服务，一次请求可限定全部官方网站，约 ¥0.036/次。",
  },
  zhipu: {
    label: "智谱",
    envVar: "ZHIPU_API_KEY",
    placeholder: "xxxx.xxxx",
    getUrl: "https://bigmodel.cn/usercenter/proj-mgmt/apikeys",
    hint: "国内服务，每次只能限定一个网站，搜索次数较多，约 ¥0.03/次。",
  },
};

export function isSearchProviderId(value: unknown): value is SearchProviderId {
  return SEARCH_PROVIDER_IDS.includes(value as SearchProviderId);
}
