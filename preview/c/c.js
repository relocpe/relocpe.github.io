import { watch, lastSeen, startTicker, tickTimes, copyButtons, scramble, h, fmt, ago, STATUS_RU } from "../shared/presence.js";
const $ = (id) => document.getElementById(id);
const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
if (reduce) document.documentElement.classList.add("rm");

// video: 720p on small screens, full file elsewhere; poster stays if autoplay is refused
const vid = $("vid");
vid.src = matchMedia("(max-width: 900px)").matches || (navigator.connection && navigator.connection.saveData) ? "../../bg5-720.mp4" : "../../bg5.mp4";
if (reduce) vid.removeAttribute("autoplay"); else vid.play().catch(() => {});
document.addEventListener("visibilitychange", () => { if (document.hidden) vid.pause(); else if (!reduce) vid.play().catch(() => {}); });

scramble($("nick"));
copyButtons();

// menu-bar clock
const clock = $("clock");
const tick = () => { const d = new Date(); clock.textContent = d.toLocaleDateString("ru-RU", { weekday: "short" }).replace(".", "") + " " + d.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" }); clock.dateTime = d.toISOString(); };
tick(); setInterval(tick, 10000);

// status: dot in the menu bar + one caption line
const cap = $("capNow");
function render(m) {
  $("dot").dataset.s = m.live ? m.status : "unknown";
  $("stTxt").textContent = m.live ? "Discord: " + (STATUS_RU[m.status] || "") : "Discord";
  const a = m.live && m.status !== "offline" ? m.activities.find((x) => x.kind === "music") || m.activities[0] : null;
  const d = h("span", "dot"); d.dataset.s = m.live ? m.status : "unknown";
  const tx = h("span", "tx"); const t = h("span");
  if (a) {
    tx.append((a.kind === "music" ? "слушает " : a.kind === "game" ? "играет в " : "") + a.title + (a.sub ? " — " + a.sub : ""));
    if (a.start) { t.dataset.start = a.start; if (a.end) t.dataset.end = a.end; }
    cap.replaceChildren(d, tx, t);
  } else if (m.live) {
    const ls = m.status === "offline" ? lastSeen(m) : null;
    if (ls && ls.act) { const g = h("span"); g.dataset.ago = ls.at; g.textContent = ago(ls.at); tx.append("был ", g, " · " + (ls.act.kind === "music" ? "последний трек " : "") + ls.act.title + (ls.act.sub ? " — " + ls.act.sub : "")); }
    else tx.append(m.status === "offline" ? "discord: тихо" : "discord: " + (STATUS_RU[m.status] || "в сети") + (m.custom ? " · " + m.custom : ""));
    cap.replaceChildren(d, tx);
  } else cap.replaceChildren(d, h("span", "tx", "discord…"));
  tickTimes(cap);
}
render({ live: false, activities: [] });
watch(render);
startTicker(cap);

// one continuous zoom: world scales around the Ya.Music-RPC icon, then the icon's rect opens into the projects panel
const glyph = $("pnGlyph"), cine = $("cine"), world = $("world"), panel = $("work"), pnIn = $("pnIn"), icon = $("icoYa"), nick = $("nick").parentElement, caps = document.querySelectorAll(".cap"), mbOthers = [...document.querySelectorAll("#mbar .mb-l, #mbar .mb-r > *")].filter((e) => e.id !== "icoYa");
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const ss = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
let G = null, p = 0, pt = 0, raf = 0;
function measure() {
  world.style.transform = "none";
  const r = icon.getBoundingClientRect(), W = innerWidth, H = innerHeight;
  const top = cine.offsetTop, len = cine.offsetHeight - H;
  // final icon scale: icon box grows to roughly a third of the screen before the panel takes over
  const gr = icon.querySelector("svg").getBoundingClientRect();
  G = { gw: gr.width, cx: r.left + r.width / 2, cy: r.top + r.height / 2, w: r.width, hgt: r.height, W, H, top, len, S: Math.max(W, H) / r.width * 0.45 };
  apply(p);
}
function apply(v) {
  if (!G) return;
  const z = ss(0.04, 0.62, v), s = Math.pow(G.S, z);              // log-linear zoom = even perceived speed
  const m = ss(0.03, 0.5, v), X = G.cx + (G.W / 2 - G.cx) * m, Y = G.cy + (G.H / 2 - G.cy) * m;   // icon drifts to the centre while it grows
  world.style.transform = `translate3d(${X}px,${Y}px,0) scale(${s}) translate3d(${-G.cx}px,${-G.cy}px,0)`;
  nick.style.opacity = 1 - ss(0.02, 0.2, v);
  caps.forEach((c) => (c.style.opacity = 1 - ss(0.02, 0.14, v)));
  const fo = (1 - ss(0.26, 0.4, v)).toFixed(3); mbOthers.forEach((e) => (e.style.opacity = fo));
  // panel rect: from the scaled icon box to the full viewport
  const k = ss(0.36, 0.8, v);
  const iw = G.w * s, ih = G.hgt * s;
  const l = (X - iw / 2) * (1 - k), t = (Y - ih / 2) * (1 - k);
  const rr = (G.W - (X + iw / 2)) * (1 - k), b = (G.H - (Y + ih / 2)) * (1 - k);
  glyph.style.transform = `translate3d(${X - G.gw / 2}px,${Y - G.gw / 2}px,0) scale(${(s * (1 + k * 0.6)).toFixed(3)})`;
  glyph.style.opacity = 1 - ss(0.5, 0.7, v);
  const on = v > 0.36;
  panel.style.visibility = on ? "visible" : "hidden";
  panel.style.clipPath = `inset(${t.toFixed(1)}px ${rr.toFixed(1)}px ${b.toFixed(1)}px ${l.toFixed(1)}px round ${(10 * (1 - k) + 0.01).toFixed(2)}px)`;
  pnIn.style.opacity = ss(0.55, 0.84, v);
  pnIn.style.transform = `scale(${(0.94 + 0.06 * ss(0.5, 0.9, v)).toFixed(4)})`;
  world.style.visibility = k >= 1 ? "hidden" : "visible";
  if (!vid.paused && k >= 1) vid.pause(); else if (vid.paused && k < 1 && !reduce && !document.hidden) vid.play().catch(() => {});
}
// scroll-linked, lightly smoothed (lerp) so wheel steps don't stutter; no smoothing past the target
const read = () => clamp((scrollY - G.top) / G.len);
function loop() {
  p += (pt - p) * 0.2;
  if (Math.abs(pt - p) < 0.0005) p = pt;
  apply(p);
  raf = p !== pt ? requestAnimationFrame(loop) : 0;
}
if (!reduce) {
  measure(); p = pt = read(); apply(p);
  addEventListener("scroll", () => { pt = read(); if (!raf) raf = requestAnimationFrame(loop); }, { passive: true });
  addEventListener("resize", () => { measure(); pt = p = read(); apply(p); });
  document.fonts && document.fonts.ready.then(measure);
  // jump links land on the open panel
  document.querySelectorAll("[data-jump]").forEach((a) => a.addEventListener("click", (e) => { e.preventDefault(); scrollTo({ top: G.top + G.len * 0.86, behavior: "smooth" }); }));
} else {
  panel.style.visibility = "visible";
}
