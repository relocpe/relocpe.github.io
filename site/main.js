import { watch, firstImage, lastSeen, copyText, ago, h } from "./presence.js?v=1122";

const RM = matchMedia("(prefers-reduced-motion: reduce)").matches;
const COARSE = matchMedia("(pointer: coarse)").matches;
const FINE = matchMedia("(hover: hover) and (pointer: fine)").matches;

// ---- background video (kept as before): 720p on phones / save-data, muted + playsinline + poster
const v = document.getElementById("v");
{
  const q = new URLSearchParams(location.search);
  const small = q.get("hq") !== "1" && ((COARSE && Math.min(screen.width, screen.height) <= 820) || innerWidth <= 820 || (navigator.connection && navigator.connection.saveData));
  v.muted = true; v.defaultMuted = true; v.loop = true; v.playsInline = true;
  v.src = small ? "bg5-720.mp4" : "bg5.mp4";
  const play = () => { const p = v.play(); if (p && p.catch) p.catch(() => {}); };
  if (RM) v.removeAttribute("autoplay"); else play();
  document.addEventListener("visibilitychange", () => { if (document.hidden) v.pause(); else if (!RM) play(); });
}

// ---- static grain tile (desktop only, opacity .03 in CSS)
const grain = document.querySelector(".grain");
if (grain && getComputedStyle(grain).display !== "none") {
  try { const n = 180, c = document.createElement("canvas"); c.width = c.height = n; const g = c.getContext("2d"), d = g.createImageData(n, n);
    for (let i = 0; i < d.data.length; i += 4) { const x = Math.random() * 255; d.data[i] = d.data[i + 1] = d.data[i + 2] = x; d.data[i + 3] = 255; }
    g.putImageData(d, 0, 0); grain.style.backgroundImage = `url(${c.toDataURL()})`; } catch {}
}

// ---- copy Discord handle: label → «скопировано» for 1.5 s
document.querySelectorAll("[data-copy]").forEach((b) => {
  const l = b.querySelector(".cp-l"), orig = l.textContent; let tm;
  b.addEventListener("click", async () => {
    const ok = await copyText(b.dataset.copy);
    l.textContent = ok ? "скопировано" : "не вышло"; b.classList.toggle("done", ok);
    clearTimeout(tm); tm = setTimeout(() => { l.textContent = orig; b.classList.remove("done"); }, 1500);
  });
});

// ---- floating preview that trails the cursor (lerp .15 per frame), fine pointers only
if (FINE) {
  const pv = document.getElementById("pv"), img = pv.querySelector("img");
  let tx = 0, ty = 0, x = 0, y = 0, raf = 0, on = false;
  const W = 320, H = 200, OFF = 24;
  const target = (e) => {
    tx = e.clientX + OFF; ty = e.clientY + OFF;
    if (tx + W > innerWidth - 12) tx = e.clientX - W - OFF;
    if (ty + H > innerHeight - 12) ty = e.clientY - H - OFF;
  };
  const loop = () => {
    const k = RM ? 1 : 0.15; x += (tx - x) * k; y += (ty - y) * k;
    pv.style.transform = `translate3d(${x.toFixed(1)}px,${y.toFixed(1)}px,0)`;
    if (on || Math.abs(tx - x) > 0.5 || Math.abs(ty - y) > 0.5) raf = requestAnimationFrame(loop); else raf = 0;
  };
  document.querySelectorAll("[data-pv]").forEach((a) => {
    const pre = new Image(); let loaded = false;
    a.addEventListener("pointerenter", (e) => {
      if (!loaded) { pre.src = a.dataset.pv; loaded = true; }
      if (img.getAttribute("src") !== a.dataset.pv) img.src = a.dataset.pv;
      target(e); if (!on) { x = tx; y = ty; } on = true; pv.classList.add("on");
      if (!raf) raf = requestAnimationFrame(loop);
    });
    a.addEventListener("pointermove", target, { passive: true });
    a.addEventListener("pointerleave", () => { on = false; pv.classList.remove("on"); });
  });
  addEventListener("scroll", () => { if (on) { on = false; pv.classList.remove("on"); } }, { passive: true });
}

// ---- live Discord status pill (Cloudflare proxy → Lanyard, via presence.js)
const st = document.getElementById("st");
const TXT = { online: "в сети", idle: "отошёл", dnd: "не беспокоить", offline: "не в сети" };
let seq = 0;
async function render(m) {
  const my = ++seq;
  if (!m || !m.live) { st.hidden = true; return; }
  const music = m.status !== "offline" && m.activities.find((a) => a.kind === "music");
  const other = m.status !== "offline" && !music && m.activities[0];
  const av = h("span", "st-av"), dot = h("span", "st-dot " + (music ? "music" : m.status)), tx = h("span", "st-tx");
  dot.setAttribute("aria-hidden", "true");
  let line, sub = "";
  if (music) {
    line = h("span", "st-l"); line.append(h("b", "", "Слушает: "), document.createTextNode(music.title + (music.sub ? " — " + music.sub : "")));
    sub = music.app === "Spotify" ? "через Spotify" : "через Ya.Music-RPC";
  } else if (other) {
    const verb = other.kind === "game" ? "играет в " : other.kind === "ide" ? "пишет код в " : "";
    line = h("span", "st-l", verb + other.app);
    if (other.sub) sub = other.sub;
  } else {
    line = h("span", "st-l", TXT[m.status] || "не в сети");
    if (m.status === "offline") { const ls = lastSeen(m); if (ls) sub = "был в сети " + ago(ls.at); }
    else if (m.custom) sub = m.custom;
  }
  tx.append(line); if (sub) tx.append(h("span", "st-s", sub));
  st.classList.toggle("music", !!music);
  st.replaceChildren(av, dot, tx); st.hidden = false;
  st.setAttribute("aria-label", "Discord: " + tx.textContent);
  const src = await firstImage(music && music.art.length ? music.art : m.avatar);
  if (my !== seq) return;
  if (!src && music) { const a2 = await firstImage(m.avatar); if (a2 && my === seq) { const im = new Image(); im.alt = ""; im.src = a2; av.append(im); } return; }
  if (src) { const im = new Image(); im.alt = ""; im.width = im.height = 28; im.src = src; av.append(im); }
}
watch(render);
