import { watch, firstImage, tickTimes, startTicker, STATUS_RU, h, monogram } from "../shared/presence.js";
import { entrances, copyButtons } from "../shared/common.js";
document.querySelectorAll(".nm span").forEach((s, i) => s.style.setProperty("--k", i));
const $ = (id) => document.getElementById(id);
// the name spans the frame edge to edge: measure once per font load / resize
const fit = () => { const n = $("name"), nm = n.querySelector(".nm"); n.style.setProperty("--fs", "100px"); const w = nm.scrollWidth, avail = n.clientWidth; if (w) n.style.setProperty("--fs", (100 * avail / w).toFixed(2) + "px"); };
document.fonts.ready.then(fit); addEventListener("resize", fit); fit();
let avKey = "";
watch(async (m) => {
  const st = m.live ? STATUS_RU[m.status] || m.status : "Discord";
  $("stTxt").textContent = m.live ? st[0].toUpperCase() + st.slice(1) : "Discord";
  $("barTxt").textContent = m.live ? "Discord: " + st : "Discord";
  $("barDot").className = "dot " + m.status;
  $("custom").textContent = m.custom; $("custom").hidden = !m.custom;
  const ul = $("acts"); ul.textContent = "";
  m.activities.slice(0, 3).forEach((a, i) => {
    const li = h("li", "act"); li.style.setProperty("--i", i + 2);
    const art = h("div", "act-art", monogram(a.name)); art.setAttribute("aria-hidden", "true");
    if (a.art.length) firstImage(a.art).then((u) => { if (u) { const im = new Image(); im.src = u; im.alt = ""; art.textContent = ""; art.appendChild(im); } });
    const tx = h("div");
    const n = h("p", "act-n"); n.append(h("span", "", a.kind + " ")); n.append(a.name); tx.append(n);
    [a.details, a.state].filter(Boolean).forEach((d) => tx.append(h("p", "act-d", d)));
    if (a.start) {
      const t = h("div", "act-t"), lab = h("span"); lab.dataset.start = a.start; if (a.end) lab.dataset.end = a.end; t.append(lab);
      if (a.end > a.start) { const b = h("span", "act-bar"), f = h("i"); f.dataset.bar = ""; b.append(f); t.append(b); }
      tx.append(t);
    }
    li.append(art, tx); ul.append(li);
  });
  tickTimes();
  const key = m.avatar.join("|");
  if (key && key !== avKey) { avKey = key; const u = await firstImage(m.avatar); if (u) $("av").src = u; }
});
startTicker(); entrances(); copyButtons();
