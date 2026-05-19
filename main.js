const { app, BrowserWindow, ipcMain, screen } = require("electron");
const si = require("systeminformation");
const { exec } = require("child_process");
const path = require("path");

let win;

function createWindow() {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;

  win = new BrowserWindow({
    width: 420,
    height: height,
    x: width - 420,
    y: 0,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    resizable: true,
    skipTaskbar: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  win.loadFile("index.html");
  win.setAlwaysOnTop(true, "screen-saver");
}

app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
ipcMain.handle("get-stats", async () => {
  const [cpu, mem, disk, net, load] = await Promise.all([
    si.currentLoad(),
    si.mem(),
    si.fsSize(),
    si.networkStats(),
    si.cpuTemperature(),
  ]);

  return {
    cpu: {
      load: cpu.currentLoad.toFixed(1),
      cores: cpu.cpus.map((c) => c.load.toFixed(1)),
    },
    mem: {
      total: mem.total,
      used: mem.used,
      free: mem.free,
      pct: ((mem.used / mem.total) * 100).toFixed(1),
    },
    disk: disk
      .filter((d) => d.size > 0)
      .map((d) => ({
        fs: d.fs,
        mount: d.mount,
        size: d.size,
        used: d.used,
        pct: d.use.toFixed(1),
      })),
    net: net[0]
      ? {
          rx: net[0].rx_sec,
          tx: net[0].tx_sec,
          iface: net[0].iface,
        }
      : { rx: 0, tx: 0, iface: "-" },
    temp: load.main ?? null,
  };
});

ipcMain.handle("get-processes", async () => {
  const data = await si.processes();
  return data.list
    .sort((a, b) => b.cpu - a.cpu)
    .slice(0, 50)
    .map((p) => ({
      pid: p.pid,
      name: p.name,
      cpu: p.cpu.toFixed(1),
      mem: p.mem.toFixed(1),
      memRss: p.memRss,
    }));
});

ipcMain.handle("kill-process", async (_, pid) => {
  return new Promise((resolve) => {
    const cmd =
      process.platform === "win32"
        ? `taskkill /PID ${pid} /F`
        : `kill -9 ${pid}`;
    exec(cmd, (err) => {
      resolve(!err);
    });
  });
});

ipcMain.on("win-close",   () => app.quit());
ipcMain.on("win-hide",    () => win.minimize());
ipcMain.on("win-opacity", (_, v) => win.setOpacity(v));
ipcMain.on("win-pin",     (_, on) => win.setAlwaysOnTop(on, "screen-saver"));
