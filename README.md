# 法律小帮手 (Law Consult)

Describe a real-life dilemma (bullying, harassment, unpaid wages, defamation...) in plain Chinese. The app:

1. Analyzes the facts and legal issues (DeepSeek).
2. Searches official Chinese law sources only (`flk.npc.gov.cn`, `npc.gov.cn`, `gov.cn`, `court.gov.cn`, `spp.gov.cn`, `moj.gov.cn`, `chinacourt.org`) via Tavily, then splits pages into articles (第X条).
3. Maps your facts to specific articles, and verifies every quote against the fetched source text. Clauses whose quote can't be found are marked "未能核实".
4. Gives concrete next steps: evidence, who to contact, deadlines, possible claims.

History is stored only in the browser's `localStorage`.

## Setup

You need a [DeepSeek](https://platform.deepseek.com/api_keys) and a [Tavily](https://app.tavily.com) API key. Either:

- click **设置 API Key** in the app header (keys are stored in your browser's `localStorage` and sent to this app's server with each request), or
- put them in `.env.local` (`cp .env.example .env.local`) as server-wide defaults. Keys set in the browser take precedence.

```bash
npm install
npm run dev                  # http://localhost:3000
npm test                     # unit tests for clause splitting and quote verification
```

## Layout

- `lib/pipeline/` — `analyze` → search → `map` → `verify` → `suggest`, orchestrated by `index.ts`
- `lib/search/` — Tavily official-domain search (`tavily.ts`) and article splitter/ranker (`clauses.ts`)
- `app/api/consult/route.ts` — streams stage progress and the final result (AI SDK UI message stream)
- `components/consult/` — UI

仅供参考，不构成法律意见。紧急情况请拨打 110；免费法律援助请拨打 12348。
