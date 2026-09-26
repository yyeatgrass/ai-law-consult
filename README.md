# 法律小帮手 (Law Consult)

**English** | [简体中文](README.zh-CN.md)

Describe a real-life dilemma (bullying, harassment, unpaid wages, defamation...) in plain Chinese, and the app finds the relevant Mainland China laws, points you to the exact articles, and suggests what to do next.

1. **Analyze**: DeepSeek extracts the facts, the parties, and the legal issues.
2. **Search**: searches the issuing authorities' sites (`flk.npc.gov.cn`, `npc.gov.cn`, `gov.cn`, `court.gov.cn`, `spp.gov.cn`, `moj.gov.cn`) via Tavily, 博查 (Bocha) or 智谱 (Zhipu), downloads the full pages, and keeps **only primary legal texts**: laws, regulations and judicial interpretations, with articles starting from 第一条. News, commentary (解读), Q&A, cases, courses and drafts are discarded even when they're on official sites (`lib/search/law-doc.ts`).
3. **Map and verify**: maps your facts to specific articles and checks every quote against the downloaded text. Clauses whose quote can't be found are marked "未能核实" (unverified).
4. **Suggest**: gives concrete next steps: evidence to collect, who to contact, deadlines, and possible claims.

Every law found is saved to `data/laws/` on the machine running the app (override with `LAW_LIBRARY_DIR`). Each cited clause and each suggestion's legal basis has a **核对原文** (check the original) button. It opens the saved law at that article with the quoted sentence highlighted, so you can check it yourself. Saved laws are listed at `/laws` and can be downloaded as `.txt`.

Consultation history is stored only in your browser's `localStorage`.

## Download and run (no installation)

Download the zip for your computer from [Releases](https://github.com/yyeatgrass/law-consult/releases):

| File | For |
|---|---|
| `law-consult-<version>-darwin-arm64.zip` | Macs with Apple chips (M1–M4) |
| `law-consult-<version>-darwin-x64.zip` | Intel Macs |
| `law-consult-<version>-win-x64.zip` | Windows 10/11, 64-bit |

Unzip it and double-click `LawConsult` (macOS) or `LawConsult.exe` (Windows). A console window opens and your browser opens at `http://localhost:3000`; if that port is busy, the app picks the next free one and shows the address in the window. Close the window to quit.

The binaries aren't signed with a paid developer certificate, so the system warns on first launch:

- **macOS**: right-click `LawConsult` → **Open** → **Open**, or allow it under **System Settings → Privacy & Security**. You can also run `xattr -dr com.apple.quarantine <folder>` in Terminal.
- **Windows**: in the "Windows protected your PC" dialog, click **More info** → **Run anyway**.

Downloaded laws are kept in `data/laws/` next to the program. Keep that folder when you upgrade. An optional `.env` file next to the program (copy it from `.env.example`) provides keys for everyone using this copy.

## API keys

You need a [DeepSeek](https://platform.deepseek.com/api_keys) API key plus a key for one search service. DeepSeek's API can't search the web, which is why a separate search service is needed.

| Service | Notes |
|---|---|
| [Tavily](https://app.tavily.com) | About 1,000 free credits/month; returns full page text |
| [博查 Bocha](https://open.bochaai.com) | Chinese provider; one request covers all official domains; about ¥0.036 per call |
| [智谱 Zhipu](https://bigmodel.cn/usercenter/proj-mgmt/apikeys) | Chinese provider; filters one domain per request, so it makes two calls per query; about ¥0.03 per call |

Set them either way:

- Click **设置 API Key** in the app header. Keys are stored in your browser's `localStorage` and sent to this app's server with each request.
- Or put them in `.env.local` (`cp .env.example .env.local`) as server-wide defaults. Keys set in the browser take precedence.

## Development

Requires Node.js 20.9 or later.

```bash
npm install
npm run dev                  # http://localhost:3000
npm test                     # unit tests
npm run lint
```

## Building a release

Build on macOS, because the Mac binaries are ad-hoc signed with `codesign`. The Windows build is produced there too.

```bash
npm run release                       # all targets: darwin-arm64, darwin-x64, win-x64
npm run release -- --targets=win-x64  # a subset
NODE_MIRROR=https://npmmirror.com/mirrors/node npm run release  # faster Node.js download in China
```

The script builds the Next.js standalone server, embeds `scripts/launcher.cjs` into the official Node.js binary for each platform as a [single executable application](https://nodejs.org/api/single-executable-applications.html), and writes `dist/law-consult-<version>-<target>.zip`. To publish a new version, bump `version` in `package.json`, run the script, and upload the zips to a new GitHub release.

## Project layout

- `lib/pipeline/`: `analyze` → search → `map` → `verify` → `suggest`, orchestrated by `index.ts`
- `lib/search/`: search orchestration (`index.ts`), one adapter per provider (`engines/`), official page fetcher (`fetch-page.ts`), primary-text filter (`law-doc.ts`), and article splitter/ranker (`clauses.ts`)
- `lib/law-library.ts`: local law library in `data/laws/`
- `app/api/consult/route.ts`: streams stage progress and the final result (AI SDK UI message stream)
- `app/law/[id]/`, `app/laws/`: law viewer and library pages
- `components/consult/`, `components/law/`: UI
- `scripts/`: desktop release build (`release.mjs`) and the executable's launcher (`launcher.cjs`)

## Disclaimer

For reference only; this is not legal advice. In an emergency call 110. For free legal aid call 12348.
