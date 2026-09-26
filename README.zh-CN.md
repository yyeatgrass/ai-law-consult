# 法律小帮手 (Law Consult)

[English](README.md) | **简体中文**

用大白话描述你遇到的事（被欺负、骚扰、拖欠工资、被造谣……），它会帮你找到相关的中国大陆法律，指出具体是哪一条，并告诉你接下来可以怎么做。

1. **分析**：由 DeepSeek 梳理事实、当事人和涉及的法律问题。
2. **检索**：通过 Tavily、博查或智谱，在法律发布机关的网站（`flk.npc.gov.cn`、`npc.gov.cn`、`gov.cn`、`court.gov.cn`、`spp.gov.cn`、`moj.gov.cn`）上检索并下载完整页面，**只保留法律原文**，即从第一条开始的法律、法规、司法解释。即使在官方网站上，新闻、解读、问答、案例、公开课和草案也会被排除（`lib/search/law-doc.ts`）。
3. **对应与核实**：把你的情况对应到具体条文，并用下载的原文逐句核对引用。找不到原句的条文会标为"未能核实"。
4. **建议**：给出具体的下一步，包括该收集哪些证据、找谁、有什么期限、可以提出哪些主张。

检索到的法律都会保存在运行本程序的电脑上的 `data/laws/` 文件夹里（可用 `LAW_LIBRARY_DIR` 修改位置）。每条引用的条文和每条建议的法律依据旁都有 **核对原文** 按钮，点开会跳到保存的法律原文中对应的条，并高亮引用的句子，方便你自己确认。已保存的法律可以在 `/laws` 页面查看，也可以下载为 `.txt`。

咨询记录只保存在你浏览器的 `localStorage` 里。

## 下载即用（无需安装）

在 [Releases](https://github.com/yyeatgrass/law-consult/releases) 页面下载对应电脑的压缩包：

| 文件 | 适用于 |
|---|---|
| `law-consult-<版本>-darwin-arm64.zip` | Apple 芯片（M1–M4）的 Mac |
| `law-consult-<版本>-darwin-x64.zip` | Intel 芯片的 Mac |
| `law-consult-<版本>-win-x64.zip` | Windows 10/11（64 位） |

解压后双击 `LawConsult`（macOS）或 `LawConsult.exe`（Windows）。会出现一个命令行窗口，浏览器自动打开 `http://localhost:3000`。如果 3000 端口被占用，程序会自动换用下一个空闲端口，并在窗口里显示地址。用完关闭窗口即可退出。

程序没有使用付费的开发者证书签名，首次运行时系统会提示：

- **macOS**：在 `LawConsult` 上点右键 → **打开** → 再点 **打开**；或在 **系统设置 → 隐私与安全性** 中允许打开。也可以在终端执行 `xattr -dr com.apple.quarantine <文件夹路径>`。
- **Windows**：在"Windows 已保护你的电脑"提示中点 **更多信息** → **仍要运行**。

下载的法律保存在程序旁边的 `data/laws/` 文件夹里，升级时保留这个文件夹即可。也可以在程序旁放一个 `.env` 文件（从 `.env.example` 复制）写入密钥，这样使用这份程序的所有浏览器都不用再填。

## API 密钥

需要一个 [DeepSeek](https://platform.deepseek.com/api_keys) API Key，再加一个搜索服务的 Key。DeepSeek 的 API 本身不能联网搜索，所以需要单独的搜索服务。

| 服务 | 说明 |
|---|---|
| [Tavily](https://app.tavily.com) | 每月约 1000 次免费额度；直接返回网页全文 |
| [博查 Bocha](https://open.bochaai.com) | 国内服务；一次请求可覆盖所有官方网站；约 ¥0.036/次 |
| [智谱 Zhipu](https://bigmodel.cn/usercenter/proj-mgmt/apikeys) | 国内服务；每次只能限定一个网站，所以每个搜索词会调用两次；约 ¥0.03/次 |

两种设置方式任选其一：

- 点页面顶部的 **设置 API Key**。密钥保存在你浏览器的 `localStorage` 中，每次咨询时发送给本程序的服务端。
- 或者写入 `.env.local`（`cp .env.example .env.local`），作为服务端的默认密钥。浏览器里设置的密钥优先。

## 开发

需要 Node.js 20.9 或更高版本。

```bash
npm install
npm run dev                  # http://localhost:3000
npm test                     # 单元测试
npm run lint
```

## 打包发布

请在 macOS 上打包，因为 Mac 版程序需要用 `codesign` 做本地签名。Windows 版也在 Mac 上一起生成。

```bash
npm run release                       # 全部平台：darwin-arm64、darwin-x64、win-x64
npm run release -- --targets=win-x64  # 只打包部分平台
NODE_MIRROR=https://npmmirror.com/mirrors/node npm run release  # 国内下载 Node.js 更快
```

打包脚本会先构建 Next.js standalone 服务，再把 `scripts/launcher.cjs` 以[单文件可执行程序](https://nodejs.org/api/single-executable-applications.html)的方式嵌入各平台的官方 Node.js 程序，最后生成 `dist/law-consult-<版本>-<平台>.zip`。发布新版本时，先修改 `package.json` 中的 `version`，运行打包脚本，再把压缩包上传到新的 GitHub Release。

## 项目结构

- `lib/pipeline/`：`analyze`（分析）→ 检索 → `map`（对应条文）→ `verify`（核实）→ `suggest`（建议），由 `index.ts` 串联
- `lib/search/`：检索调度（`index.ts`）、各搜索服务的适配器（`engines/`）、官方网页抓取（`fetch-page.ts`）、法律原文过滤（`law-doc.ts`）、条文拆分与排序（`clauses.ts`）
- `lib/law-library.ts`：`data/laws/` 本地法律库
- `app/api/consult/route.ts`：以流的形式返回各阶段进度和最终结果（AI SDK UI message stream）
- `app/law/[id]/`、`app/laws/`：法律原文查看页和法律库页面
- `components/consult/`、`components/law/`：界面组件
- `scripts/`：桌面版打包脚本（`release.mjs`）和可执行程序的启动器（`launcher.cjs`）

## 免责声明

仅供参考，不构成法律意见。紧急情况请拨打 110；免费法律援助请拨打 12348。
