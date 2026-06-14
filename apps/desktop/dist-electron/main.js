import { ipcMain as a, app as s, BrowserWindow as i } from "electron";
import { fileURLToPath as u } from "node:url";
import n from "node:path";
const p = n.dirname(u(import.meta.url));
process.env.APP_ROOT = n.join(p, "..");
const r = process.env.VITE_DEV_SERVER_URL, v = n.join(process.env.APP_ROOT, "dist-electron"), c = n.join(process.env.APP_ROOT, "dist");
process.env.VITE_PUBLIC = r ? n.join(process.env.APP_ROOT, "public") : c;
let t;
function l() {
  t = new i({
    title: "Mentor AMP",
    icon: n.join(process.env.VITE_PUBLIC, "electron-vite.svg"),
    webPreferences: {
      preload: n.join(p, "preload.mjs")
    }
  }), t.webContents.on("did-finish-load", () => {
    t == null || t.webContents.send("main-process-message", (/* @__PURE__ */ new Date()).toLocaleString());
  }), r ? t.loadURL(r) : t.loadFile(n.join(c, "index.html"));
}
a.handle("health:check", async () => {
  try {
    const o = await fetch("http://127.0.0.1:8000/health");
    if (!o.ok)
      return {
        status: "unreachable",
        app: "Mentor AMP",
        version: "0.1.0"
      };
    const e = await o.json();
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
a.handle("system:status", async () => {
  try {
    const o = await fetch("http://127.0.0.1:8000/system/status");
    return o.ok ? await o.json() : {
      api: {
        status: "unreachable",
        version: "0.1.0"
      },
      app: {
        name: "Mentor AMP",
        environment: "development"
      },
      database: {
        status: "not_connected"
      }
    };
  } catch {
    return {
      api: {
        status: "unreachable",
        version: "0.1.0"
      },
      app: {
        name: "Mentor AMP",
        environment: "development"
      },
      database: {
        status: "not_connected"
      }
    };
  }
});
s.on("window-all-closed", () => {
  process.platform !== "darwin" && (s.quit(), t = null);
});
s.on("activate", () => {
  i.getAllWindows().length === 0 && l();
});
s.whenReady().then(() => {
  s.setName("Mentor AMP"), l();
});
export {
  v as MAIN_DIST,
  c as RENDERER_DIST,
  r as VITE_DEV_SERVER_URL
};
