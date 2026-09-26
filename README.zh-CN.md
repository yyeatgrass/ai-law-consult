# 法律小帮手 (Law Consult)

[English](README.md) | **简体中文**

用大白话描述你遇到的事（被欺负、骚扰、拖欠工资、被造谣……），它会帮你找到相关的中国大陆法律，指出具体是哪一条，并告诉你接下来可以怎么做。

1. **分析**：由 DeepSeek 梳理事实、当事人和涉及的法律问题。
2. **检索**：通过 Tavily、博查或智谱，在法律发布机关的网站（`flk.npc.gov.cn`、`npc.gov.cn`、`gov.cn`、`court.gov.cn`、`spp.gov.cn`、`moj.gov.cn`）上检索并下载完整页面，**只保留法律原文**，即从第一条开始的法律、法规、司法解释。即使在官方网站上，新闻、解读、问答、案例、公开课和草案也会被排除（`lib/search/law-doc.ts`）。
3. **对应与核实**：把你的情况对应到具体条文，并用下载的原文逐句核对引用。找不到原句的条文会标为"未能核实"。
4. **建议**：给出具体的下一步，包括该收集哪些证据、找谁、有什么期限、可以提出哪些主张。

检索到的法律都会保存在运行本程序的电脑上的 `data/laws/` 文件夹里（可用 `LAW_LIBRARY_DIR` 修改位置）。每条引用的条文和每条建议的法律依据旁都有 **核对原文** 按钮，点开会跳到保存的法律原文中对应的条，并高亮引用的句子，方便你自己确认。已保存的法律可以在 `/laws` 页面查看，也可以下载为 `.txt`。

咨询记录和 API Key 只保存在你自己的电脑上。

## 安装桌面版

在 [Releases](https://github.com/yyeatgrass/law-consult/releases) 页面下载对应电脑的安装包：

| 文件 | 适用于 |
|---|---|
| `LawConsult-<版本>-mac-arm64.dmg` | Apple 芯片（M1–M4）的 Mac |
| `LawConsult-<版本>-mac-x64.dmg` | Intel 芯片的 Mac |
| `LawConsult-<版本>-win-x64.exe` | Windows 10/11（64 位） |

- **macOS**：打开 `.dmg`，把 **法律小帮手** 拖进 **应用程序** 文件夹。
- **Windows**：运行安装程序，安装后桌面和开始菜单都会有快捷方式。

之后像普通软件一样打开"法律小帮手"即可。第一次使用时，点窗口顶部的 **设置 API Key**（见下方 [API 密钥](#api-密钥)）。

程序没有使用付费的开发者证书签名，首次运行时系统会提示：

- **macOS**：系统会提示"未打开'法律小帮手'"。点 **完成**，打开 **系统设置 → 隐私与安全性**，拉到最下方，在"法律小帮手"旁点 **仍要打开**，再确认一次即可，以后不会再提示。macOS 14 及更早版本也可以在应用上点右键 → **打开**。另一种方法是在终端执行 `xattr -dr com.apple.quarantine /Applications/法律小帮手.app`，提示"已损坏"时也可以这样解决。
- **Windows**：在"Windows 已保护你的电脑"提示中点 **更多信息** → **仍要运行**。

下载的法律保存在程序的数据文件夹里，升级后不会丢失：macOS 为 `~/Library/Application Support/法律小帮手/laws`，Windows 为 `%APPDATA%\法律小帮手\laws`。通过菜单栏的 **法律库** 可以查看已下载的法律或打开这个文件夹。

## API 密钥

需要一个 [DeepSeek](https://platform.deepseek.com/api_keys) API Key，再加一个搜索服务的 Key。DeepSeek 的 API 本身不能联网搜索，所以需要单独的搜索服务。

| 服务 | 说明 |
|---|---|
| [Tavily](https://app.tavily.com) | 每月约 1000 次免费额度；直接返回网页全文 |
| [博查 Bocha](https://open.bochaai.com) | 国内服务；一次请求可覆盖所有官方网站；约 ¥0.036/次 |
| [智谱 Zhipu](https://bigmodel.cn/usercenter/proj-mgmt/apikeys) | 国内服务；每次只能限定一个网站，所以每个搜索词会调用两次；约 ¥0.03/次 |

两种设置方式任选其一：

- 点窗口顶部的 **设置 API Key**。密钥保存在 `localStorage` 中，每次咨询时发送给程序内置的服务端。
- 从源码运行时，也可以写入 `.env.local`（`cp .env.example .env.local`），作为服务端的默认密钥。在程序里设置的密钥优先。

## 开发

需要 Node.js 20.9 或更高版本。

```bash
npm install
npm run dev                  # 网页版：http://localhost:3000
npm test                     # 单元测试
npm run lint
```

不打安装包、直接试运行桌面版：

```bash
node scripts/release.mjs --stage-only   # 把 Next.js 服务构建到 desktop/server
cd desktop && npm install && npm start
```

## 打包安装程序

请在 macOS 上打包：Mac 版需要用 `codesign` 做本地签名，electron-builder 也能在 Mac 上直接生成 Windows 安装程序（不需要 Wine）。

```bash
npm run release              # macOS arm64 + x64 的 .dmg，以及 Windows x64 安装程序
npm run release -- --mac     # 只打包 macOS
npm run release -- --win     # 只打包 Windows
```

打包脚本会先构建 Next.js standalone 服务，放到 `desktop/server`，再在 `desktop/` 里运行 electron-builder，安装包输出到 `dist/desktop/`。由于在国内从 GitHub 下载不稳定，Electron 和 electron-builder 的二进制文件默认从 npmmirror CDN 下载；加 `--no-mirror` 可改用官方地址。`desktop/main.cjs` 会在 Electron 的 utility process 中运行服务，监听 `127.0.0.1:38517`。端口固定是因为保存的密钥和咨询记录与端口绑定，只有 38517 被占用时才会临时换用其他空闲端口。

发布新版本时，先修改 `package.json` 中的 `version`（脚本会自动同步到 `desktop/package.json`），运行打包脚本，再把 `.dmg` 和 `.exe` 上传到新的 GitHub Release。

## 项目结构

- `lib/pipeline/`：`analyze`（分析）→ 检索 → `map`（对应条文）→ `verify`（核实）→ `suggest`（建议），由 `index.ts` 串联
- `lib/search/`：检索调度（`index.ts`）、各搜索服务的适配器（`engines/`）、官方网页抓取（`fetch-page.ts`）、法律原文过滤（`law-doc.ts`）、条文拆分与排序（`clauses.ts`）
- `lib/law-library.ts`：`data/laws/` 本地法律库
- `app/api/consult/route.ts`：以流的形式返回各阶段进度和最终结果（AI SDK UI message stream）
- `app/law/[id]/`、`app/laws/`：法律原文查看页和法律库页面
- `components/consult/`、`components/law/`：界面组件
- `desktop/`：Electron 外壳（`main.cjs`）、打包钩子（`after-pack.cjs`）、应用图标（`build/`）和 electron-builder 配置（`package.json`）
- `scripts/release.mjs`：打包安装程序

## 免责声明

仅供参考，不构成法律意见。紧急情况请拨打 110；免费法律援助请拨打 12348。
