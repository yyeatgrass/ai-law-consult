// Entry point embedded into the LawConsult executable (Node single executable
// application). Inside the executable `require` only resolves built-in
// modules, so the Next.js server is loaded from disk through createRequire.
const fs = require("node:fs");
const http = require("node:http");
const net = require("node:net");
const path = require("node:path");
const { spawn } = require("node:child_process");
const { createRequire } = require("node:module");

function isSea() {
  try {
    return require("node:sea").isSea();
  } catch {
    return false;
  }
}

const baseDir = isSea() ? path.dirname(process.execPath) : path.resolve(__dirname, "..", "dist", "stage");
const appDir = path.join(baseDir, "app");
const serverFile = path.join(appDir, "server.js");

function fail(message) {
  console.error(`\n[法律小帮手] ${message}\n`);
  if (process.platform === "win32") {
    console.error("按回车键退出…");
    process.stdin.resume();
    process.stdin.once("data", () => process.exit(1));
  } else {
    process.exit(1);
  }
}

function canListen(port, host) {
  return new Promise((resolve) => {
    const srv = net.createServer();
    srv.once("error", () => resolve(false));
    srv.listen(port, host, () => srv.close(() => resolve(true)));
  });
}

// Binding 127.0.0.1 can succeed while another server holds the IPv6 wildcard
// on the same port, and "localhost" in the browser may then reach that one.
function someoneListens(port, host) {
  return new Promise((resolve) => {
    const socket = net.connect({ port, host, timeout: 500 });
    const done = (result) => {
      socket.destroy();
      resolve(result);
    };
    socket.once("connect", () => done(true));
    socket.once("timeout", () => done(false));
    socket.once("error", () => done(false));
  });
}

async function findPort(start, host) {
  for (let port = start; port < start + 20; port++) {
    const busy = (await someoneListens(port, "127.0.0.1")) || (await someoneListens(port, "::1"));
    if (!busy && (await canListen(port, host))) return port;
  }
  return null;
}

function waitForServer(url, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  return new Promise((resolve) => {
    const attempt = () => {
      const req = http.get(url, (res) => {
        res.resume();
        resolve(true);
      });
      req.on("error", () => {
        if (Date.now() > deadline) resolve(false);
        else setTimeout(attempt, 300);
      });
    };
    attempt();
  });
}

function openBrowser(url) {
  const opts = { detached: true, stdio: "ignore" };
  const child =
    process.platform === "win32"
      ? spawn("cmd", ["/c", "start", "", url], { ...opts, windowsHide: true })
      : spawn(process.platform === "darwin" ? "open" : "xdg-open", [url], opts);
  child.on("error", () => {});
  child.unref();
}

async function main() {
  if (!fs.existsSync(serverFile)) {
    fail(`找不到程序文件 ${serverFile}\n请确认 app 文件夹和本程序放在同一个目录下。`);
    return;
  }

  const envFile = path.join(baseDir, ".env");
  if (fs.existsSync(envFile)) process.loadEnvFile(envFile);

  // Not HOSTNAME: some shells export it as the machine name.
  const host = process.env.LAW_CONSULT_HOST || "127.0.0.1";
  const port = await findPort(Number(process.env.PORT) || 3000, host);
  if (port == null) {
    fail("端口 3000–3019 都被占用了，请关闭其他程序后重试。");
    return;
  }

  process.env.NODE_ENV = "production";
  process.env.HOSTNAME = host;
  process.env.PORT = String(port);
  process.env.LAW_LIBRARY_DIR ||= path.join(baseDir, "data", "laws");

  const url = `http://localhost:${port}`;
  console.log("法律小帮手正在启动…");
  createRequire(serverFile)(serverFile);

  if (await waitForServer(`http://${host}:${port}/`, 30000)) {
    console.log(`\n已启动：${url}`);
    console.log(`下载的法律保存在：${process.env.LAW_LIBRARY_DIR}`);
    console.log("关闭此窗口即可退出。\n");
    if (!process.argv.includes("--no-open")) openBrowser(url);
  } else {
    console.error(`服务启动超时，请稍后手动打开 ${url}`);
  }
}

main().catch((err) => fail(err instanceof Error ? err.stack || err.message : String(err)));
