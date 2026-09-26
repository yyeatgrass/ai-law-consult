# AI法律小帮手 (Law Consult)

**English** | [简体中文](README.zh-CN.md)

Describe a real-life dilemma (bullying, harassment, unpaid wages, defamation...) in plain Chinese, and the app finds the relevant Mainland China laws, points you to the exact articles, and suggests what to do next.

1. **Analyze**: DeepSeek extracts the facts, the parties, and the legal issues.
2. **Search**: searches the issuing authorities' sites (`flk.npc.gov.cn`, `npc.gov.cn`, `gov.cn`, `court.gov.cn`, `spp.gov.cn`, `moj.gov.cn`) via Tavily, 博查 (Bocha) or 智谱 (Zhipu), downloads the full pages, and keeps **only primary legal texts**: laws, regulations and judicial interpretations, with articles starting from 第一条. News, commentary (解读), Q&A, cases, courses and drafts are discarded even when they're on official sites (`lib/search/law-doc.ts`).
3. **Map and verify**: maps your facts to specific articles and checks every quote against the downloaded text. Clauses whose quote can't be found are marked "未能核实" (unverified).
4. **Suggest**: gives concrete next steps: evidence to collect, who to contact, deadlines, and possible claims.

Every law found is saved to `data/laws/` on the machine running the app (override with `LAW_LIBRARY_DIR`). Each cited clause and each suggestion's legal basis has a **核对原文** (check the original) button. It opens the saved law at that article with the quoted sentence highlighted, so you can check it yourself. Saved laws are listed at `/laws` and can be downloaded as `.txt`.

Consultation history and API keys are stored only on your own computer.

## Install the desktop app

Download the installer for your computer from [Releases](https://github.com/yyeatgrass/law-consult/releases):

| File | For |
|---|---|
| `LawConsult-<version>-mac-arm64.dmg` | Macs with Apple chips (M1–M4) |
| `LawConsult-<version>-mac-x64.dmg` | Intel Macs |
| `LawConsult-<version>-win-x64.exe` | Windows 10/11, 64-bit |

- **macOS**: open the `.dmg` and drag **AI法律小帮手** into **Applications**.
- **Windows**: run the installer. It adds a desktop shortcut and a Start menu entry.

Then open AI法律小帮手 like any other app. On first use, click **设置 API Key** at the top of the window (see [API keys](#api-keys) below).

The app isn't signed with a paid developer certificate, so the system warns on first launch:

- **macOS**: macOS says "AI法律小帮手" Not Opened. Click **Done**, open **System Settings → Privacy & Security**, scroll to the bottom and click **Open Anyway** next to AI法律小帮手, then confirm. You only need to do this once. On macOS 14 and earlier you can instead right-click the app → **Open**. Alternatively, run `xattr -dr com.apple.quarantine /Applications/AI法律小帮手.app` in Terminal, which also fixes an "is damaged" message.
- **Windows**: in the "Windows protected your PC" dialog, click **More info** → **Run anyway**.

Downloaded laws are kept in the app's data folder, which survives upgrades: `~/Library/Application Support/AI法律小帮手/laws` on macOS and `%APPDATA%\AI法律小帮手\laws` on Windows. The **法律库** menu opens the saved laws or that folder. Data saved under the previous name 法律小帮手 is moved there automatically the first time you open this version.

## API keys

You need a [DeepSeek](https://platform.deepseek.com/api_keys) API key plus a key for one search service. DeepSeek's API can't search the web, which is why a separate search service is needed.

| Service | Notes |
|---|---|
| [Tavily](https://app.tavily.com) | About 1,000 free credits/month; returns full page text |
| [博查 Bocha](https://open.bochaai.com) | Chinese provider; one request covers all official domains; about ¥0.036 per call |
| [智谱 Zhipu](https://bigmodel.cn/usercenter/proj-mgmt/apikeys) | Chinese provider; filters one domain per request, so it makes two calls per query; about ¥0.03 per call |

Set them either way:

- Click **设置 API Key** in the app header. Keys are stored in `localStorage` and sent to the app's server with each request.
- When running from source, you can instead put them in `.env.local` (`cp .env.example .env.local`) as server-wide defaults. Keys set in the app take precedence.

## Development

Requires Node.js 20.9 or later.

```bash
npm install
npm run dev                  # web version at http://localhost:3000
npm test                     # unit tests
npm run lint
```

To try the desktop shell without building installers:

```bash
node scripts/release.mjs --stage-only   # build the Next.js server into desktop/server
cd desktop && npm install && npm start
```

## Building the installers

Build on macOS: the Mac apps are ad-hoc signed with `codesign`, and electron-builder can produce the Windows installer there too (no Wine needed).

```bash
npm run release              # macOS arm64 + x64 .dmg and Windows x64 installer
npm run release -- --mac     # macOS only
npm run release -- --win     # Windows only
```

The script builds the Next.js standalone server, stages it into `desktop/server`, and runs electron-builder in `desktop/`. The installers are written to `dist/desktop/`. Electron and electron-builder binaries are downloaded from the npmmirror CDN by default, because GitHub downloads are unreliable in China; pass `--no-mirror` to use the official sources. `desktop/main.cjs` runs the server in an Electron utility process on `127.0.0.1:38517`. The port is fixed because saved keys and history are tied to it, and the app falls back to a random free port only when 38517 is taken.

To publish a new version, bump `version` in `package.json` (the script copies it into `desktop/package.json`), run the script, and upload the `.dmg` and `.exe` files to a new GitHub release.

## Project layout

- `lib/pipeline/`: `analyze` → search → `map` → `verify` → `suggest`, orchestrated by `index.ts`
- `lib/search/`: search orchestration (`index.ts`), one adapter per provider (`engines/`), official page fetcher (`fetch-page.ts`), primary-text filter (`law-doc.ts`), and article splitter/ranker (`clauses.ts`)
- `lib/law-library.ts`: local law library in `data/laws/`
- `app/api/consult/route.ts`: streams stage progress and the final result (AI SDK UI message stream)
- `app/law/[id]/`, `app/laws/`: law viewer and library pages
- `components/consult/`, `components/law/`: UI
- `desktop/`: Electron shell (`main.cjs`), packaging hook (`after-pack.cjs`), app icon (`build/`), and electron-builder config (`package.json`)
- `scripts/release.mjs`: builds the installers

## Disclaimer

For reference only; this is not legal advice. In an emergency call 110. For free legal aid call 12348.
