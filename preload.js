const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("api", {
  getStats:     ()      => ipcRenderer.invoke("get-stats"),
  getProcesses: ()      => ipcRenderer.invoke("get-processes"),
  killProcess:  (pid)   => ipcRenderer.invoke("kill-process", pid),
  close:        ()      => ipcRenderer.send("win-close"),
  hide:         ()      => ipcRenderer.send("win-hide"),
  setOpacity:   (v)     => ipcRenderer.send("win-opacity", v),
  setPin:       (on)    => ipcRenderer.send("win-pin", on),
});
