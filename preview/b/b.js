import { watch, firstImage, tickTimes, startTicker, STATUS_RU, h, monogram } from "../shared/presence.js";
import { entrances, copyButtons } from "../shared/common.js";
const $ = (id) => document.getElementById(id);
// clock like the macOS menu bar, in the visitor's time
const clk = () => { const d = new Date(); $("clock").textContent = d.toLocaleString("ru-RU", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).replace(/,/g, ""); $("clock").dateTime = d.toISOString(); };
clk(); setInterval(clk, 10000);
// menu-bar titles open and close their menus (both open on load)
document.querySelectorAll("[data-menu]").forEach((b) => b.addEventListener("click", () => {
  const m = $(b.dataset.menu), open = b.getAttribute("aria-expanded") !== "true";
  b.setAttribute("aria-expanded", String(open)); m.classList.toggle("shut", !open);
}));
let avKey = "";
watch(async (m) => {
  const st = m.live ? STATUS_RU[m.status] || m.status : "статус не загрузился";
  $("mbSt").textContent = m.live ? "Discord: " + st : "Discord";
  $("mbDot").className = $("dcDot").className = "dot " + m.status;
  $("dcSt").textContent = st; $("dcName").textContent = m.name;
  $("dcCustom").textContent = m.custom; $("dcCustom").hidden = !m.custom;
  const box = $("dcActs"); box.textContent = "";
  if (!m.activities.length) box.append(h("p", "dc-empty", m.live ? "Сейчас ничем не занят" : "relocpe в Discord"));
  m.activities.slice(0, 3).forEach((a) => {
    const row = h("div", "act"); row.dataset.act = "";
    const art = h("div", "act-art", monogram(a.name)); art.setAttribute("aria-hidden", "true");
    if (a.art.length) firstImage(a.art).then((u) => { if (u) { const im = new Image(); im.src = u; im.alt = ""; art.textContent = ""; art.append(im); } });
    const tx = h("div");
    tx.append(h("p", "act-k", a.kind), h("p", "act-n", a.name));
    [a.details, a.state].filter(Boolean).forEach((d) => tx.append(h("p", "act-d", d)));
    if (a.start) {
      const t = h("div", "act-t"), lab = h("span"); lab.dataset.start = a.start; if (a.end) lab.dataset.end = a.end; t.append(lab);
      if (a.end > a.start) { const b = h("span", "act-bar"), f = h("i"); f.dataset.bar = ""; b.append(f); t.append(b); }
      tx.append(t);
    }
    row.append(art, tx); box.append(row);
  });
  tickTimes();
  const key = m.avatar.join("|");
  if (key && key !== avKey) { avKey = key; const u = await firstImage(m.avatar); if (u) $("dcAv").src = $("mbAv").src = u; }
});
startTicker(); entrances(); copyButtons();
