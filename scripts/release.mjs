#!/usr/bin/env node
// Builds self-contained release archives for macOS and Windows:
//   dist/law-consult-<version>-<target>.zip
// Each archive holds a LawConsult executable (the official Node.js binary with
// scripts/launcher.cjs embedded as a single executable application) plus the
// Next.js standalone server in app/.
//
// Usage: node scripts/release.mjs [--skip-build] [--targets=darwin-arm64,win-x64]
// Env:   NODE_MIRROR (default https://nodejs.org/dist, e.g. https://npmmirror.com/mirrors/node)
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dist = path.join(root, "dist");
const stage = path.join(dist, "stage");
const cache = path.join(dist, ".cache");

const ALL_TARGETS = ["darwin-arm64", "darwin-x64", "win-x64"];
const SEA_FUSE = "NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2";

const args = process.argv.slice(2);
const targetsArg = args.find((a) => a.startsWith("--targets="));
const targets = targetsArg ? targetsArg.slice("--targets=".length).split(",") : ALL_TARGETS;
for (const t of targets) {
  if (!ALL_TARGETS.includes(t)) throw new Error(`Unknown target ${t}; expected one of ${ALL_TARGETS.join(", ")}`);
}

const nodeVersion = process.version;
const mirror = (process.env.NODE_MIRROR || "https://nodejs.org/dist").replace(/\/$/, "");
const { version } = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));

function run(cmd, cmdArgs, opts = {}) {
  execFileSync(cmd, cmdArgs, { stdio: "inherit", cwd: root, ...opts });
}

function copyDir(from, to) {
  fs.cpSync(from, to, { recursive: true, verbatimSymlinks: true });
}

async function download(url, dest) {
  if (fs.existsSync(dest)) return;
  console.log(`Downloading ${url}`);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Download failed (${res.status}): ${url}`);
  const tmp = `${dest}.part`;
  fs.writeFileSync(tmp, Buffer.from(await res.arrayBuffer()));
  fs.renameSync(tmp, dest);
}

async function nodeBinary(target) {
  const [platform, arch] = target.split("-");
  const name = `node-${nodeVersion}-${platform === "win" ? "win" : "darwin"}-${arch}`;
  const outDir = path.join(cache, name);
  const bin = path.join(outDir, platform === "win" ? "node.exe" : "node");
  if (fs.existsSync(bin)) return bin;
  fs.mkdirSync(outDir, { recursive: true });

  if (platform === "win") {
    const archive = path.join(cache, `${name}.zip`);
    await download(`${mirror}/${nodeVersion}/${name}.zip`, archive);
    run("unzip", ["-q", "-j", "-o", archive, `${name}/node.exe`, "-d", outDir]);
  } else {
    const archive = path.join(cache, `${name}.tar.gz`);
    await download(`${mirror}/${nodeVersion}/${name}.tar.gz`, archive);
    run("tar", ["-xzf", archive, "-C", outDir, "--strip-components=2", `${name}/bin/node`]);
  }
  return bin;
}

function stageApp() {
  const standalone = path.join(root, ".next", "standalone");
  if (!fs.existsSync(path.join(standalone, "server.js"))) {
    throw new Error("Missing .next/standalone/server.js; run without --skip-build.");
  }
  fs.rmSync(stage, { recursive: true, force: true });
  const app = path.join(stage, "app");
  copyDir(standalone, app);
  copyDir(path.join(root, ".next", "static"), path.join(app, ".next", "static"));
  if (fs.existsSync(path.join(root, "public"))) copyDir(path.join(root, "public"), path.join(app, "public"));
  // Never ship a local library or env file from the build machine.
  fs.rmSync(path.join(app, "data"), { recursive: true, force: true });
  for (const f of fs.readdirSync(app)) if (f.startsWith(".env")) fs.rmSync(path.join(app, f));
  // sharp only serves next/image optimization, which next.config.ts disables.
  for (const dep of ["sharp", "@img"]) {
    fs.rmSync(path.join(app, "node_modules", dep), { recursive: true, force: true });
  }

  const native = fs.globSync("**/*.node", { cwd: app });
  if (native.length) throw new Error(`Platform-specific native modules in bundle: ${native.join(", ")}`);
}

function buildSeaBlob() {
  const config = path.join(stage, "sea-config.json");
  const blob = path.join(stage, "sea-prep.blob");
  fs.writeFileSync(
    config,
    JSON.stringify({
      main: path.join(root, "scripts", "launcher.cjs"),
      output: blob,
      disableExperimentalSEAWarning: true,
      useSnapshot: false,
      useCodeCache: false,
    }),
  );
  run(process.execPath, ["--experimental-sea-config", config]);
  return blob;
}

function readme(target) {
  const win = target.startsWith("win");
  const exe = win ? "LawConsult.exe" : "LawConsult";
  const firstRun = win
    ? `首次运行时 Windows 可能提示"Windows 已保护你的电脑"，点"更多信息" → "仍要运行"。`
    : `首次运行时 macOS 可能提示"无法验证开发者"。请在 ${exe} 上点右键 → "打开" → 再点"打开"；
或者打开"系统设置 → 隐私与安全性"，在下方点"仍要打开"。
也可以在终端执行：xattr -dr com.apple.quarantine <本文件夹路径>`;
  return `法律咨询助手 v${version}

使用方法
1. 双击 ${exe}，会出现一个命令行窗口，浏览器会自动打开 http://localhost:3000
   （3000 端口被占用时会自动换用 3001、3002…，以窗口里显示的地址为准）。
2. 第一次使用时，点页面右上角的"API 密钥"按钮，填写 DeepSeek 密钥和一个搜索服务
   （Tavily / 博查 / 智谱）的密钥。密钥只保存在你自己的浏览器里。
3. 用完后关闭命令行窗口即可退出。

${firstRun}

文件说明
- ${exe}      启动程序
- app/        程序文件，请勿移动或删除
- data/laws/  下载的法律原文（首次下载后自动创建），升级时保留此文件夹即可
- .env        （可选）把 .env.example 复制为 .env 并填写密钥，所有浏览器都能直接使用，无需再填

本程序仅检索官方发布的法律原文，给出的内容仅供参考，不构成正式法律意见。
如需帮助，可拨打 12348 公共法律服务热线。
`;
}

async function packageTarget(target, blob) {
  const win = target.startsWith("win");
  const name = `law-consult-${version}-${target}`;
  const out = path.join(dist, name);
  fs.rmSync(out, { recursive: true, force: true });
  fs.mkdirSync(out, { recursive: true });

  const exe = path.join(out, win ? "LawConsult.exe" : "LawConsult");
  fs.copyFileSync(await nodeBinary(target), exe);
  fs.chmodSync(exe, 0o755);
  if (!win) run("codesign", ["--remove-signature", exe]);
  const postjectArgs = [exe, "NODE_SEA_BLOB", blob, "--sentinel-fuse", SEA_FUSE];
  if (!win) postjectArgs.push("--macho-segment-name", "NODE_SEA");
  run("npx", ["--yes", "postject@1.0.0-alpha.6", ...postjectArgs]);
  if (!win) run("codesign", ["--sign", "-", "--force", exe]);

  copyDir(path.join(stage, "app"), path.join(out, "app"));
  fs.copyFileSync(path.join(root, ".env.example"), path.join(out, ".env.example"));
  const notes = readme(target);
  fs.writeFileSync(path.join(out, "使用说明.txt"), win ? `\ufeff${notes.replace(/\n/g, "\r\n")}` : notes);

  const zip = path.join(dist, `${name}.zip`);
  fs.rmSync(zip, { force: true });
  run("zip", ["-qry", zip, name], { cwd: dist });
  console.log(`Created ${path.relative(root, zip)}`);
  return zip;
}

if (!args.includes("--skip-build")) run("npx", ["next", "build"]);
stageApp();
const blob = buildSeaBlob();
for (const target of targets) await packageTarget(target, blob);
