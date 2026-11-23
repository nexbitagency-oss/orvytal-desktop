// Uso: APP=crm node scripts/build.js   (compila para el sistema donde se ejecuta)
const builder = require("electron-builder");
const apps = require("../apps.json");
const pkg = require("../package.json");

const key = process.env.APP;
const cfg = apps[key];
if (!cfg) {
  console.error(`Define APP con uno de: ${Object.keys(apps).join(", ")}`);
  process.exit(1);
}

const { Platform, Arch } = builder;
const targets =
  process.platform === "darwin"
    ? Platform.MAC.createTarget(["dmg"], Arch.arm64, Arch.x64)
    : process.platform === "win32"
      ? Platform.WINDOWS.createTarget(["nsis"], Arch.x64)
      : Platform.LINUX.createTarget(["AppImage"], Arch.x64);

builder
  .build({
    targets,
    publish: "never",
    config: {
      appId: cfg.appId,
      productName: cfg.name,
      copyright: "© ORVYTAL",
      publish: [{ provider: "generic", url: "https://orvytal.net/descargas/" }],
      directories: { output: `dist/${key}`, buildResources: `build/${key}` },
      files: ["main.js", "offline.html", "apps.json", "package.json"],
      extraMetadata: { orvytalApp: key, name: `orvytal-${key}`, version: pkg.version },
      afterPack: require("path").join(__dirname, "adhoc-sign.js"),
      icon: `build/${key}/icon.png`,
      mac: {
        category: "public.app-category.business",
        identity: null,
        artifactName: `${cfg.file}-Mac-\${arch}.\${ext}`,
      },
      dmg: { title: cfg.name },
      win: { artifactName: `${cfg.file}-Windows.\${ext}` },
      nsis: {
        oneClick: false,
        allowToChangeInstallationDirectory: true,
        perMachine: false,
        createDesktopShortcut: true,
        shortcutName: cfg.name,
      },
      linux: { artifactName: `${cfg.file}-Linux.\${ext}`, category: "Office" },
    },
  })
  .then((out) => console.log(out.join("\n")))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
