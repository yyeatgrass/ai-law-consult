# 法律小帮手 (Law Consult)

Describe a real-life dilemma (bullying, harassment, unpaid wages, defamation...) in plain Chinese. The app:

1. Analyzes the facts and legal issues (DeepSeek).
2. Searches the issuing authorities' sites (`flk.npc.gov.cn`, `npc.gov.cn`, `gov.cn`, `court.gov.cn`, `spp.gov.cn`, `moj.gov.cn`) via Tavily, 博查 (Bocha) or 智谱 (Zhipu), downloads the full pages, and keeps **only primary legal texts** (laws, regulations, judicial interpretations with articles from 第一条 onward). News, commentary (解读), Q&A, cases, courses and drafts are discarded even on official sites (`lib/search/law-doc.ts`).
3. Maps your facts to specific articles, and verifies every quote against the fetched source text. Clauses whose quote can't be found are marked "未能核实".
4. Gives concrete next steps: evidence, who to contact, deadlines, possible claims.

Every official page found is saved to `data/laws/` on the machine running the app (override with `LAW_LIBRARY_DIR`). Each cited clause and each suggestion's legal basis has a **核对原文** button that opens the saved law at that article with the quoted sentence highlighted, so you can check it yourself. Saved laws are listed at `/laws` and can be downloaded as `.txt`.

History is stored only in the browser's `localStorage`.

## Setup

You need a [DeepSeek](https://platform.deepseek.com/api_keys) API key plus a key for one search service:

| Service | Notes |
|---|---|
| [Tavily](https://app.tavily.com) | ~1000 free credits/month; returns full page text |
| [博查 Bocha](https://open.bochaai.com) | Domestic; one request covers all official domains; ~¥0.036/call |
| [智谱 Zhipu](https://bigmodel.cn/usercenter/proj-mgmt/apikeys) | Domestic; filters one domain per request, so it makes two calls per query; ~¥0.03/call |

Either:

- click **设置 API Key** in the app header (keys are stored in your browser's `localStorage` and sent to this app's server with each request), or
- put them in `.env.local` (`cp .env.example .env.local`) as server-wide defaults. Keys set in the browser take precedence.

```bash
npm install
npm run dev                  # http://localhost:3000
npm test                     # unit tests for clause splitting and quote verification
```

## Desktop release (macOS / Windows)

End users don't need Node.js. Download the zip for your platform from [Releases](https://github.com/yyeatgrass/law-consult/releases), unzip it, and double-click `LawConsult` (macOS) or `LawConsult.exe` (Windows). A console window opens, the browser opens at `http://localhost:3000` (or the next free port), and closing the window stops the app. Downloaded laws are kept in `data/laws/` next to the executable; an optional `.env` there provides server-side keys.

To build the archives (on macOS, since the Mac binaries are ad-hoc signed with `codesign`):

```bash
npm run release                       # all targets: darwin-arm64, darwin-x64, win-x64
npm run release -- --targets=win-x64  # a subset
NODE_MIRROR=https://npmmirror.com/mirrors/node npm run release  # faster download in China
```

The script builds the Next.js standalone server, embeds `scripts/launcher.cjs` into the official Node.js binary for each platform as a [single executable application](https://nodejs.org/api/single-executable-applications.html), and writes `dist/law-consult-<version>-<target>.zip`. The binaries are not notarized or code-signed with a developer certificate, so macOS Gatekeeper and Windows SmartScreen warn on first launch; the bundled `使用说明.txt` explains how to proceed.

## Layout

- `lib/pipeline/` — `analyze` → search → `map` → `verify` → `suggest`, orchestrated by `index.ts`
- `lib/search/` — search orchestration (`index.ts`), one adapter per provider (`engines/`), official page fetcher (`fetch-page.ts`), and article splitter/ranker (`clauses.ts`)
- `app/api/consult/route.ts` — streams stage progress and the final result (AI SDK UI message stream)
- `components/consult/` — UI

仅供参考，不构成法律意见。紧急情况请拨打 110；免费法律援助请拨打 12348。
