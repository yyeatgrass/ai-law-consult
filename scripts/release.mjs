#!/usr/bin/env node
// Builds the desktop installers into dist/desktop/:
//   macOS:   LawConsult-<version>-mac-arm64.dmg, LawConsult-<version>-mac-x64.dmg
//   Windows: LawConsult-<version>-win-x64.exe (NSIS installer)
// The Next.js standalone server is staged into desktop/server and shipped as an
// Electron extra resource; desktop/main.cjs runs it in a utility process.
//
// Usage: node scripts/release.mjs [--skip-build] [--stage-only] [--mac] [--win] [--no-mirror]
//   --mac / --win pick the platforms (default: both); --stage-only prepares
//   desktop/server for `npm start` in desktop/ without building installers.
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const desktop = path.join(root, "desktop");
const serverDir = path.join(desktop, "server");

const args = process.argv.slice(2);
const platforms = ["--mac", "--win"].filter((p) => args.includes(p));

const mirrors = {
  ELECTRON_MIRROR: "https://cdn.npmmirror.com/binaries/electron/",
  ELECTRON_BUILDER_BINARIES_MIRROR: "https://cdn.npmmirror.com/binaries/electron-builder-binaries/",
};
const env = { ...process.env };
if (!args.includes("--no-mirror")) for (const [k, v] of Object.entries(mirrors)) env[k] ??= v;

function run(cmd, cmdArgs, cwd = root) {
  execFileSync(cmd, cmdArgs, { stdio: "inherit", cwd, env });
}

function copyDir(from, to) {
  fs.cpSync(from, to, { recursive: true, verbatimSymlinks: true });
}

function stageServer() {
  const standalone = path.join(root, ".next", "standalone");
  if (!fs.existsSync(path.join(standalone, "server.js"))) {
    throw new Error("Missing .next/standalone/server.js; run without --skip-build.");
  }
  fs.rmSync(serverDir, { recursive: true, force: true });
  copyDir(standalone, serverDir);
  copyDir(path.join(root, ".next", "static"), path.join(serverDir, ".next", "static"));
  if (fs.existsSync(path.join(root, "public"))) copyDir(path.join(root, "public"), path.join(serverDir, "public"));
  // Never ship a local library or env file from the build machine.
  fs.rmSync(path.join(serverDir, "data"), { recursive: true, force: true });
  for (const f of fs.readdirSync(serverDir)) if (f.startsWith(".env")) fs.rmSync(path.join(serverDir, f));
  // sharp only serves next/image optimization, which next.config.ts disables.
  for (const dep of ["sharp", "@img"]) {
    fs.rmSync(path.join(serverDir, "node_modules", dep), { recursive: true, force: true });
  }

  const native = fs.globSync("**/*.node", { cwd: serverDir });
  if (native.length) throw new Error(`Platform-specific native modules in bundle: ${native.join(", ")}`);
}

function syncVersion() {
  const { version } = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
  const pkgPath = path.join(desktop, "package.json");
  const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
  if (pkg.version !== version) {
    pkg.version = version;
    fs.writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`);
  }
}

if (!args.includes("--skip-build")) run("npx", ["next", "build"]);
stageServer();
syncVersion();
if (args.includes("--stage-only")) process.exit(0);
if (args.includes("--stage-only")) process.exit(0);
if (!fs.existsSync(path.join(desktop, "node_modules", "electron-builder"))) {
  run("npm", ["install", "--no-audit", "--no-fund"], desktop);
}
run("npx", ["electron-builder", ...(platforms.length ? platforms : ["--mac", "--win"]), "--publish", "never"], desktop);
