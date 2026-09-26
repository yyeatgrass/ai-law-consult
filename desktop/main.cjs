// Electron shell: runs the bundled Next.js standalone server in a utility
// process and shows it in a native window.
const { app, BrowserWindow, Menu, dialog, shell, utilityProcess } = require("electron");
const fs = require("node:fs");
const http = require("node:http");
const net = require("node:net");
const path = require("node:path");

const APP_NAME = "法律小帮手";
const HOST = "127.0.0.1";
// localStorage (API keys, history) is scoped to the origin, so keep the port
// stable across launches and only fall back when it is taken.
const PREFERRED_PORT = 38517;

let server = null;
let mainWindow = null;
let baseUrl = null;
let quitting = false;

const serverDir = app.isPackaged
  ? path.join(process.resourcesPath, "server")
  : path.join(__dirname, "server");
const libraryDir = path.join(app.getPath("userData"), "laws");

function portIsFree(port) {
  return new Promise((resolve) => {
    const srv = net.createServer();
    srv.once("error", () => resolve(false));
    srv.listen(port, HOST, () => srv.close(() => resolve(true)));
  });
}

async function pickPort() {
  if (await portIsFree(PREFERRED_PORT)) return PREFERRED_PORT;
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.once("error", reject);
    srv.listen(0, HOST, () => {
      const { port } = srv.address();
      srv.close(() => resolve(port));
    });
  });
}

function waitForServer(url, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  return new Promise((resolve) => {
    const attempt = () => {
      if (!server) return resolve(false);
      const req = http.get(url, (res) => {
        res.resume();
        resolve(true);
      });
      req.on("error", () => {
        if (Date.now() > deadline) resolve(false);
        else setTimeout(attempt, 200);
      });
    };
    attempt();
  });
}

async function startServer() {
  const serverFile = path.join(serverDir, "server.js");
  if (!fs.existsSync(serverFile)) throw new Error(`找不到程序文件：${serverFile}`);

  const port = await pickPort();
  fs.mkdirSync(libraryDir, { recursive: true });
  server = utilityProcess.fork(serverFile, [], {
    cwd: serverDir,
    serviceName: "law-consult-server",
    stdio: "pipe",
    env: {
      ...process.env,
      NODE_ENV: "production",
      HOSTNAME: HOST,
      PORT: String(port),
      LAW_LIBRARY_DIR: libraryDir,
      NEXT_TELEMETRY_DISABLED: "1",
    },
  });
  server.stdout?.on("data", (d) => process.stdout.write(d));
  server.stderr?.on("data", (d) => process.stderr.write(d));
  server.on("exit", (code) => {
    server = null;
    if (quitting) return;
    dialog.showErrorBox(APP_NAME, `后台服务意外退出（代码 ${code}），请重新打开程序。`);
    app.quit();
  });

  const url = `http://${HOST}:${port}`;
  if (!(await waitForServer(`${url}/api/config`, 30000))) throw new Error("后台服务启动超时。");
  return url;
}

const LOADING_PAGE = `data:text/html;charset=utf-8,${encodeURIComponent(`<!doctype html>
<meta charset="utf-8"><title>${APP_NAME}</title>
<body style="margin:0;height:100vh;display:grid;place-items:center;font-family:-apple-system,'PingFang SC','Microsoft YaHei',sans-serif;color:#555">
<div>正在启动${APP_NAME}…</div></body>`)}`;

function isAppUrl(url) {
  return baseUrl != null && (url === baseUrl || url.startsWith(`${baseUrl}/`));
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 860,
    minWidth: 720,
    minHeight: 560,
    title: APP_NAME,
    show: false,
    webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true },
  });
  mainWindow.once("ready-to-show", () => mainWindow.show());
  mainWindow.on("closed", () => {
    mainWindow = null;
  });

  // Official law pages and other external links open in the system browser.
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (isAppUrl(url)) return { action: "allow" };
    if (/^https?:\/\//.test(url)) shell.openExternal(url);
    return { action: "deny" };
  });
  mainWindow.webContents.on("will-navigate", (event, url) => {
    if (isAppUrl(url) || url.startsWith("data:")) return;
    event.preventDefault();
    if (/^https?:\/\//.test(url)) shell.openExternal(url);
  });

  mainWindow.loadURL(baseUrl ?? LOADING_PAGE);
}

function buildMenu() {
  const lawMenu = {
    label: "法律库",
    submenu: [
      { label: "已下载的法律", click: () => baseUrl && mainWindow?.loadURL(`${baseUrl}/laws`) },
      { label: "打开法律库文件夹", click: () => shell.openPath(libraryDir) },
    ],
  };
  const template = [
    ...(process.platform === "darwin" ? [{ role: "appMenu" }] : []),
    { role: "fileMenu" },
    { role: "editMenu" },
    { role: "viewMenu" },
    lawMenu,
    { role: "windowMenu" },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.setName(APP_NAME);

  app.on("second-instance", () => {
    if (!mainWindow) return;
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  });

  app.whenReady().then(async () => {
    buildMenu();
    createWindow();
    try {
      baseUrl = await startServer();
      mainWindow?.loadURL(baseUrl);
    } catch (err) {
      dialog.showErrorBox(APP_NAME, `启动失败：${err instanceof Error ? err.message : String(err)}`);
      app.quit();
    }
  });

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });

  app.on("window-all-closed", () => {
    if (process.platform !== "darwin") app.quit();
  });

  app.on("before-quit", () => {
    quitting = true;
    server?.kill();
  });
}
