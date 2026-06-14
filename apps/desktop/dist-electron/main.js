import { ipcMain as l, app as t, BrowserWindow as i } from "electron";
import { fileURLToPath as h } from "node:url";
import o from "node:path";
const a = o.dirname(h(import.meta.url));
process.env.APP_ROOT = o.join(a, "..");
const s = process.env.VITE_DEV_SERVER_URL, m = o.join(process.env.APP_ROOT, "dist-electron"), p = o.join(process.env.APP_ROOT, "dist");
process.env.VITE_PUBLIC = s ? o.join(process.env.APP_ROOT, "public") : p;
let n;
function c() {
  n = new i({
    title: "Mentor AMP",
    icon: o.join(process.env.VITE_PUBLIC, "electron-vite.svg"),
    webPreferences: {
      preload: o.join(a, "preload.mjs")
    }
  }), n.webContents.on("did-finish-load", () => {
    n == null || n.webContents.send("main-process-message", (/* @__PURE__ */ new Date()).toLocaleString());
  }), s ? n.loadURL(s) : n.loadFile(o.join(p, "index.html"));
}
l.handle("health:check", async () => {
  try {
    const r = await fetch("http://127.0.0.1:8000/health");
    if (!r.ok)
      return {
        status: "unreachable",
        app: "Mentor AMP",
        version: "0.1.0"
      };
    const e = await r.json();
    return {
      status: typeof (e == null ? void 0 : e.status) == "string" ? e.status : "ok",
      app: typeof (e == null ? void 0 : e.app) == "string" ? e.app : "Mentor AMP",
      version: typeof (e == null ? void 0 : e.version) == "string" ? e.version : "0.1.0"
    };
  } catch {
    return {
      status: "unreachable",
      app: "Mentor AMP",
      version: "0.1.0"
    };
  }
});
t.on("window-all-closed", () => {
  process.platform !== "darwin" && (t.quit(), n = null);
});
t.on("activate", () => {
  i.getAllWindows().length === 0 && c();
});
t.whenReady().then(() => {
  t.setName("Mentor AMP"), c();
});
export {
  m as MAIN_DIST,
  p as RENDERER_DIST,
  s as VITE_DEV_SERVER_URL
};
