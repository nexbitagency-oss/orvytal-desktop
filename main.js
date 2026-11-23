const { app, BrowserWindow, Menu, shell, nativeTheme } = require("electron");
const fs = require("fs");
const path = require("path");

const apps = require("./apps.json");
const key = process.env.APP || require("./package.json").orvytalApp || "x";
const cfg = apps[key];
if (!cfg) throw new Error(`App desconocida: ${key}`);

app.setName(cfg.name);
app.setAppUserModelId(cfg.appId);

// Hosts que se abren dentro de la app (inicio de sesión incluido).
const INTERNAL = [/(^|\.)orvytal\.net$/, /\.lovable\.app$/, /^accounts\.google\.com$/, /\.supabase\.co$/];
const isInternal = (u) => {
  try {
    const { protocol, hostname } = new URL(u);
    return protocol === "https:" && INTERNAL.some((r) => r.test(hostname));
  } catch {
    return false;
  }
};

const stateFile = path.join(app.getPath("userData"), "window-state.json");
function loadState() {
  try {
    return JSON.parse(fs.readFileSync(stateFile, "utf8"));
  } catch {
    return { width: 1360, height: 860 };
  }
}
function saveState(win) {
  if (win.isDestroyed() || win.isMinimized()) return;
  const b = win.getNormalBounds();
  try {
    fs.writeFileSync(stateFile, JSON.stringify({ ...b, maximized: win.isMaximized() }));
  } catch {
    /* sin permisos de escritura */
  }
}

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  let win;
  app.on("second-instance", () => {
    if (!win) return;
    if (win.isMinimized()) win.restore();
    win.focus();
  });

  function createWindow() {
    const st = loadState();
    win = new BrowserWindow({
      width: st.width,
      height: st.height,
      x: st.x,
      y: st.y,
      minWidth: 980,
      minHeight: 640,
      title: cfg.name,
      backgroundColor: cfg.color,
      autoHideMenuBar: true,
      show: false,
      webPreferences: { contextIsolation: true, sandbox: true, spellcheck: true },
    });
    if (st.maximized) win.maximize();
    win.once("ready-to-show", () => win.show());

    win.webContents.setWindowOpenHandler(({ url }) => {
      if (isInternal(url)) return { action: "allow" };
      if (/^https?:/.test(url)) shell.openExternal(url);
      return { action: "deny" };
    });
    win.webContents.on("will-navigate", (e, url) => {
      if (url.startsWith("file:")) return;
      if (!isInternal(url)) {
        e.preventDefault();
        if (/^https?:/.test(url)) shell.openExternal(url);
      }
    });
    win.webContents.on("did-fail-load", (_e, code, _d, url, isMain) => {
      if (!isMain || code === -3) return;
      win.loadFile(path.join(__dirname, "offline.html"), { query: { url: cfg.url } });
    });
    win.on("close", () => saveState(win));
    win.loadURL(cfg.url);
  }

  function buildMenu() {
    const isMac = process.platform === "darwin";
    Menu.setApplicationMenu(
      Menu.buildFromTemplate([
        ...(isMac ? [{ role: "appMenu" }] : []),
        { role: "editMenu" },
        {
          label: "Ver",
          submenu: [
            { role: "reload", label: "Recargar" },
            { role: "togglefullscreen", label: "Pantalla completa" },
            { type: "separator" },
            { role: "resetZoom", label: "Tamaño real" },
            { role: "zoomIn", label: "Acercar" },
            { role: "zoomOut", label: "Alejar" },
          ],
        },
        { role: "windowMenu" },
      ]),
    );
  }

  app.whenReady().then(() => {
    nativeTheme.themeSource = "system";
    buildMenu();
    createWindow();
    app.on("activate", () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  });
  app.on("window-all-closed", () => {
    if (process.platform !== "darwin") app.quit();
  });
}
