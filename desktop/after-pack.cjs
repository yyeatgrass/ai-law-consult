// electron-builder drops node_modules from extraResources, so copy the staged
// Next.js server into the packaged app here (before signing and installers).
const fs = require("node:fs");
const path = require("node:path");

exports.default = async function afterPack(context) {
  const { appOutDir, electronPlatformName, packager } = context;
  const resources =
    electronPlatformName === "darwin"
      ? path.join(appOutDir, `${packager.appInfo.productFilename}.app`, "Contents", "Resources")
      : path.join(appOutDir, "resources");
  const target = path.join(resources, "server");
  fs.rmSync(target, { recursive: true, force: true });
  fs.cpSync(path.join(__dirname, "server"), target, { recursive: true, verbatimSymlinks: true });
  if (!fs.existsSync(path.join(target, "node_modules", "next", "package.json"))) {
    throw new Error(`Server copy is incomplete: ${target}`);
  }
};
