const HIST = 60;
const history = {
  cpu: Array(HIST).fill(0),
  mem: Array(HIST).fill(0),
  rx:  Array(HIST).fill(0),
  tx:  Array(HIST).fill(0),
};

const fmtBytes = (b) => {
  if (!b || b < 0) return "0 B";
  if (b >= 1e9) return `${(b / 1e9).toFixed(1)} GB`;
  if (b >= 1e6) return `${(b / 1e6).toFixed(1)} MB`;
  if (b >= 1e3) return `${(b / 1e3).toFixed(1)} KB`;
  return `${b} B`;
};

const fmtNet = (b) => {
  if (!b || b < 0) return "0 B/s";
  if (b >= 1e6) return `${(b / 1e6).toFixed(1)} MB/s`;
  if (b >= 1e3) return `${(b / 1e3).toFixed(1)} KB/s`;
  return `${Math.round(b)} B/s`;
};

const pctColor = (p) => {
  p = parseFloat(p);
  if (p >= 85) return "#ef4444";
  if (p >= 60) return "#f59e0b";
  return "#00e5ff";
};

const tempColor = (t) => {
  if (t >= 85) return "#ef4444";
  if (t >= 65) return "#f59e0b";
  return "#10b981";
};

function drawSparkline(canvas, data, color = "#00e5ff", max = 100) {
  const ctx = canvas.getContext("2d");
  const W = canvas.offsetWidth * devicePixelRatio;
  const H = canvas.offsetHeight * devicePixelRatio;
  canvas.width  = W;
  canvas.height = H;
  ctx.clearRect(0, 0, W, H);

  if (data.every(v => v === 0)) return;

  const step  = W / (data.length - 1);
  const scale = H / (max || 1);

  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, color + "44");
  grad.addColorStop(1, color + "00");
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(0, H);
  data.forEach((v, i) => {
    ctx.lineTo(i * step, H - Math.min(v, max) * scale);
  });
  ctx.lineTo(W, H);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = color;
  ctx.lineWidth   = 1.5 * devicePixelRatio;
  ctx.lineJoin    = "round";
  ctx.beginPath();
  data.forEach((v, i) => {
    const x = i * step;
    const y = H - Math.min(v, max) * scale;
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  });
  ctx.stroke();
}

document.querySelectorAll(".tab").forEach(tab => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
    document.querySelectorAll(".panel").forEach(p => p.classList.remove("active"));
    tab.classList.add("active");
    document.getElementById(`tab-${tab.dataset.tab}`).classList.add("active");
    if (tab.dataset.tab === "process") loadProcesses();
  });
});

let pinned = true;

document.getElementById("btn-close").addEventListener("click", () => window.api.close());
document.getElementById("btn-hide").addEventListener("click",  () => window.api.hide());

document.getElementById("btn-pin").addEventListener("click", () => {
  pinned = !pinned;
  document.getElementById("btn-pin").classList.toggle("active", pinned);
  window.api.setPin(pinned);
});

document.getElementById("opacity-slider").addEventListener("input", (e) => {
  window.api.setOpacity(e.target.value / 100);
});

let toastTimer;
function toast(msg, color = "#00e5ff") {
  const el = document.getElementById("toast");
  el.textContent = msg;
  el.style.borderColor = color + "44";
  el.style.color = color;
  el.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("show"), 2200);
}

let uptimeSec = 0;
setInterval(() => {
  const now = new Date();
  document.getElementById("sb-time").textContent =
    now.toLocaleTimeString("ko-KR", { hour12: false });
  uptimeSec++;
  const h = Math.floor(uptimeSec / 3600);
  const m = Math.floor((uptimeSec % 3600) / 60);
  document.getElementById("sb-uptime").textContent = `up ${h}h ${m}m`;
}, 1000);

async function updateStats() {
  let stats;
  try { stats = await window.api.getStats(); }
  catch { return; }

  const cpu = parseFloat(stats.cpu.load);
  const mem = parseFloat(stats.mem.pct);
  const rx  = stats.net.rx || 0;
  const tx  = stats.net.tx || 0;

  history.cpu.push(cpu); history.cpu.shift();
  history.mem.push(mem); history.mem.shift();
  history.rx.push(rx);   history.rx.shift();
  history.tx.push(tx);   history.tx.shift();

  const cpuEl  = document.getElementById("ov-cpu");
  cpuEl.textContent = cpu.toFixed(1);
  cpuEl.className   = "val " + (cpu >= 85 ? "hot" : cpu >= 60 ? "warn" : "");

  const cpuBar = document.getElementById("ov-cpu-bar");
  cpuBar.style.width      = cpu + "%";
  cpuBar.style.background = pctColor(cpu);

  const memEl = document.getElementById("ov-mem");
  memEl.textContent = mem;
  memEl.className   = "val " + (mem >= 85 ? "hot" : mem >= 60 ? "warn" : "");

  const memBar = document.getElementById("ov-mem-bar");
  memBar.style.width      = mem + "%";
  memBar.style.background = pctColor(mem);

  document.getElementById("ov-mem-used").textContent  = fmtBytes(stats.mem.used);
  document.getElementById("ov-mem-free").textContent  = fmtBytes(stats.mem.free);
  document.getElementById("ov-mem-total").textContent = fmtBytes(stats.mem.total);

  document.getElementById("ov-rx").textContent    = fmtNet(rx);
  document.getElementById("ov-tx").textContent    = fmtNet(tx);
  document.getElementById("ov-iface").textContent = stats.net.iface;

  if (stats.temp !== null && stats.temp > 0) {
    document.getElementById("temp-card").style.display = "block";
    const t    = stats.temp;
    const tEl  = document.getElementById("ov-temp");
    tEl.textContent = t;
    tEl.style.color = tempColor(t);
    const tBar = document.getElementById("ov-temp-bar");
    tBar.style.width      = Math.min(t, 100) + "%";
    tBar.style.background = tempColor(t);
  }

  const maxNet = Math.max(...history.rx, ...history.tx, 1);
  drawSparkline(document.getElementById("spark-cpu"), history.cpu, pctColor(cpu), 100);
  drawSparkline(document.getElementById("spark-mem"), history.mem, pctColor(mem), 100);
  drawSparkline(document.getElementById("spark-net"), history.rx,  "#00e5ff", maxNet);

  const totalEl  = document.getElementById("cpu-total");
  totalEl.textContent = cpu.toFixed(1);
  totalEl.style.color = pctColor(cpu);
  const totalBar = document.getElementById("cpu-total-bar");
  totalBar.style.width      = cpu + "%";
  totalBar.style.background = pctColor(cpu);

  const grid = document.getElementById("core-grid");
  if (stats.cpu.cores.length !== grid.children.length) {
    grid.innerHTML = stats.cpu.cores.map((v, i) => `
      <div class="core-cell">
        <div class="core-n">C${i}</div>
        <div class="core-v" id="core-${i}" style="color:${pctColor(v)}">${v}%</div>
      </div>
    `).join("");
  } else {
    stats.cpu.cores.forEach((v, i) => {
      const el = document.getElementById(`core-${i}`);
      if (el) { el.textContent = v + "%"; el.style.color = pctColor(v); }
    });
  }

  const diskEl = document.getElementById("disk-list");
  diskEl.innerHTML = stats.disk.map(d => `
    <div class="card">
      <div class="card-title">${d.mount} <span style="color:var(--muted);font-size:10px">${d.fs}</span></div>
      <div class="gauge-label">
        <span>${fmtBytes(d.used)} / ${fmtBytes(d.size)}</span>
        <span class="pct" style="color:${pctColor(d.pct)}">${d.pct}%</span>
      </div>
      <div class="gauge-track">
        <div class="gauge-fill" style="width:${d.pct}%;background:${pctColor(d.pct)}"></div>
      </div>
      <div style="margin-top:6px;font-size:10px;color:var(--muted)">
        남은 용량 <span style="color:var(--text)">${fmtBytes(d.size - d.used)}</span>
      </div>
    </div>
  `).join("");
}

let allProcs = [];
let procLoading = false;

async function loadProcesses() {
  if (procLoading) return;
  procLoading = true;
  try {
    allProcs = await window.api.getProcesses();
    document.getElementById("sb-proc").textContent = `${allProcs.length} proc`;
    renderProcesses();
  } finally {
    procLoading = false;
  }
}

function renderProcesses() {
  const q    = document.getElementById("proc-search").value.toLowerCase();
  const list = q
    ? allProcs.filter(p => p.name.toLowerCase().includes(q) || String(p.pid).includes(q))
    : allProcs;

  document.getElementById("proc-list").innerHTML = list.map(p => `
    <div class="proc-row">
      <span class="pid">${p.pid}</span>
      <span class="name" title="${p.name}">${p.name}</span>
      <span class="cpu-v" style="color:${pctColor(p.cpu)}">${p.cpu}%</span>
      <span class="mem-v">${p.mem}%</span>
      <button class="kill-btn" data-pid="${p.pid}">KILL</button>
    </div>
  `).join("");

  document.querySelectorAll(".kill-btn").forEach(btn => {
    btn.addEventListener("click", async (e) => {
      e.stopPropagation();
      const pid  = parseInt(btn.dataset.pid);
      const name = btn.closest(".proc-row").querySelector(".name").textContent;
      const ok   = await window.api.killProcess(pid);
      if (ok) {
        btn.closest(".proc-row").style.opacity = "0.3";
        toast(`[ ${name} ] 종료됨`, "#10b981");
        setTimeout(loadProcesses, 800);
      } else {
        toast(`[ ${name} ] 종료 실패 (권한 부족)`, "#ef4444");
      }
    });
  });
}

document.getElementById("proc-search").addEventListener("input", renderProcesses);

updateStats();
setInterval(updateStats, 1500);
setInterval(() => {
  const activeTab = document.querySelector(".tab.active")?.dataset?.tab;
  if (activeTab === "process") loadProcesses();
}, 3000);
