import { $, RM, COARSE, clamp, lerp, ease, S, bgVideo, sound, smooth, through, pinned, cursor, copies, chars, pushedDates, watch, h } from "./core.js";
import { popUpdate } from "./pop.js";

const v = bgVideo($("v")), vbox = $("vbox"), shade = $("shade");
sound(v, $("snd"), { onChange: (on) => { $("sndL").textContent = on ? "звук: вкл" : "звук: выкл"; } });
const tile = (() => { try { const n = 180, c = document.createElement("canvas"); c.width = c.height = n; const g = c.getContext("2d"), d = g.createImageData(n, n); for (let i = 0; i < d.data.length; i += 4) { const x = Math.random() * 255; d.data[i] = d.data[i + 1] = d.data[i + 2] = x; d.data[i + 3] = 255; } g.putImageData(d, 0, 0); return `url(${c.toDataURL()})`; } catch { return ""; } })();
document.querySelector(".grain").style.backgroundImage = tile;

// ---- Nimbus visual: the real strategy list from macos/Payload/strategies.tsv, set as type
const STRAT = ["general", "general (ALT)", "general (ALT2)", "general (ALT3)", "general (ALT4)", "general (ALT5)", "general (ALT6)", "general (ALT7)", "general (ALT8)", "general (ALT9)", "general (ALT10)", "general (ALT11)", "general (ALT12)", "general (EXP)", "general (FAKE TLS AUTO)", "general (FAKE TLS AUTO ALT)", "general (FAKE TLS AUTO ALT2)", "general (FAKE TLS AUTO ALT3)", "general (SIMPLE FAKE)", "general (SIMPLE FAKE ALT)", "general (SIMPLE FAKE ALT2)"];
document.querySelectorAll("[data-nimbus]").forEach((a) => {
  const nb = h("div", "nb"), hd = h("div", "nb-h"), ul = h("ul", "nb-l");
  hd.append(h("b", "", "zapret · стратегии"), h("span", "", `${STRAT.length}`));
  STRAT.forEach((s, i) => { const li = h("li", i === 1 ? "on" : "", s); ul.appendChild(li); });
  nb.append(hd, ul, h("p", "nb-f", "./macos/build.sh"));
  const g = h("i", "nb-g"); a.append(nb, g);
});
document.querySelectorAll(".mf-g,.nb-g").forEach((g) => { g.style.backgroundImage = tile; });

// ---- line masks: every [data-ln] rises out of its own mask, staggered 70 ms inside its [data-lg] group
document.querySelectorAll("[data-lg]").forEach((g) => {
  const ls = g.matches("[data-ln]") ? [g] : [...g.querySelectorAll("[data-ln]")];
  ls.forEach((el, i) => { const w = document.createElement(el.tagName === "LI" || !/^(H\d|P|A|SPAN)$/.test(el.parentNode.tagName) ? "div" : "span"); w.className = "ln"; if (el.tagName === "LI") { const inner = h("div", "ln-i"); inner.style.setProperty("--d", i); while (el.firstChild) inner.appendChild(el.firstChild); w.appendChild(inner); el.appendChild(w); } else { el.parentNode.insertBefore(w, el); w.appendChild(el); el.classList.add("ln-i"); el.style.setProperty("--d", i); if (getComputedStyle(el).display === "inline") el.style.display = "block"; } });
});
const groups = [...document.querySelectorAll("[data-lg]")];
if (RM || !("IntersectionObserver" in window)) groups.forEach((g) => g.classList.add("in"));
else { const io = new IntersectionObserver((es) => es.forEach((x) => { if (x.isIntersecting) { x.target.classList.add("in"); io.unobserve(x.target); } }), { rootMargin: "0px 0px -10% 0px" }); groups.forEach((g) => io.observe(g)); }

// ---- boot log, typed: 18-24 ms per char, 120 ms between lines, ~1.9 s; any key or click skips
// ---- nick: spring mask rise (35 ms stagger), then a weight wave 300→620→300 every 10–12 s while the hero is visible;
// letters near the cursor thicken (300→560 within 220 px). font-variation-settings per letter; monospace, so no layout shift.
const nickT = $("nickT"), caret = $("caret"), nickEl = $("nick"), nickIn = $("nickIn"); chars(nickT); nickT.removeAttribute("aria-label");
const ncs = [...nickT.children], nLast = ncs.length - 1;
ncs[0].classList.add("br", "br-l"); ncs[nLast - 1].classList.add("br", "br-r"); ncs[nLast].classList.add("br");
const lets = ncs.filter((c) => !c.classList.contains("br"));
const W0 = 300, WW = 620, WH = 560, FINE = matchMedia("(hover:hover) and (pointer:fine)").matches;
const hv = lets.map(() => W0), shown = lets.map(() => W0);
const bez = (x1, y1, x2, y2) => (x) => { let t = x; for (let k = 0; k < 8; k++) { const f = 3 * x1 * t * (1 - t) ** 2 + 3 * x2 * t * t * (1 - t) + t ** 3 - x, d = 3 * x1 * (1 - t) ** 2 + 6 * (x2 - x1) * t * (1 - t) + 3 * (1 - x2) * t * t; if (Math.abs(f) < 1e-5 || Math.abs(d) < 1e-6) break; t = clamp(t - f / d); } return 3 * y1 * t * (1 - t) ** 2 + 3 * y2 * t * t * (1 - t) + t ** 3; };
const wE = bez(0.4, 0, 0.2, 1);
let typing = [], waveAt = -1, waveT = 0, mx = -1e4, my = -1e4;
function typeNick() {
  typing.forEach(clearTimeout); typing = []; clearTimeout(waveT); waveAt = -1;
  if (RM) { ncs.forEach((c) => c.classList.add("on")); return; }
  nickT.classList.add("rs"); ncs.forEach((c) => c.classList.remove("on")); void nickT.offsetWidth; nickT.classList.remove("rs");
  ncs.forEach((c, i) => typing.push(setTimeout(() => c.classList.add("on"), 60 + i * 35)));
  typing.push(setTimeout(wave, 60 + nLast * 35 + 530));
}
function wave() {
  clearTimeout(waveT);
  if (!document.hidden && pinned(hero) < 0.4) waveAt = performance.now();
  waveT = setTimeout(wave, 10000 + Math.random() * 2000);
}
function nickFrame(now) {
  let rs = null;
  if (FINE && mx > -1e3) rs = lets.map((c) => c.getBoundingClientRect());
  let waving = false;
  for (let i = 0; i < lets.length; i++) {
    let tgt = W0;
    if (rs) { const r = rs[i], s = 1 - clamp(Math.hypot(mx - r.left - r.width / 2, my - r.top - r.height / 2) / 220); tgt = W0 + (WH - W0) * s * s * (3 - 2 * s); }
    hv[i] += (tgt - hv[i]) * 0.15;
    let w = hv[i];
    if (waveAt >= 0) { const u = (now - waveAt - i * 40) / 380; if (u < 1) waving = true; if (u > 0 && u < 1) w = Math.max(w, W0 + (WW - W0) * (u < 0.5 ? wE(u * 2) : 1 - wE((u - 0.5) * 2))); }
    const q = Math.round(w); if (q !== shown[i]) { shown[i] = q; lets[i].style.fontVariationSettings = `"wght" ${q}`; }
  }
  if (!waving) waveAt = -1;
}
// cursor: parallax target + hover position (fine pointers only); applied in frame()
let pxT = 0, pyT = 0, px = 0, py = 0, lastPx = "";
if (!RM && FINE) {
  addEventListener("pointermove", (e) => { pxT = (e.clientX / innerWidth - 0.5) * 2; pyT = (e.clientY / innerHeight - 0.5) * 2; mx = e.clientX; my = e.clientY; }, { passive: true });
  document.documentElement.addEventListener("pointerleave", () => { mx = my = -1e4; pxT = pyT = 0; });
}
function boot() {
  const box = $("boot"), log = $("bootLog");
  if (RM || new URLSearchParams(location.search).has("noboot")) { box.classList.add("done"); box.style.display = "none"; typeNick(); return; }
  const L = ["bootstrapped 14%  handshake", "bootstrapped 75%  directory info", "bootstrapped 100% done"];
  let end = false, tm = [];
  const fin = () => {
    if (end) return; end = true; tm.forEach(clearTimeout); removeEventListener("keydown", fin); removeEventListener("pointerdown", fin);
    [...log.children].forEach((d, i) => d.style.setProperty("--i", i)); box.classList.add("out");
    setTimeout(() => { box.classList.add("done"); typeNick(); }, 380); setTimeout(() => { box.style.display = "none"; }, 1000);
  };
  let t = 0;
  L.forEach((s, li) => {
    const row = document.createElement("div"); const at = t;
    tm.push(setTimeout(() => log.appendChild(row), at));
    [...s].forEach((c, ci) => { t += 18 + Math.random() * 6; tm.push(setTimeout(() => { row.textContent = s.slice(0, ci + 1); }, t)); });
    if (li === L.length - 1) tm.push(setTimeout(() => { const ok = h("span", "ok", "  [ ok ]"); row.appendChild(ok); }, t + 40));
    t += 120;
  });
  tm.push(setTimeout(fin, t + 260));
  addEventListener("keydown", fin); addEventListener("pointerdown", fin);
}
boot();

// ---- header: hide on scroll down, show on scroll up; active section dot; progress line
const hud = $("hud"), progB = $("progB"), navs = [...document.querySelectorAll(".hud-nav a")];
let lastY = 0, acc = 0;
function hudTick(y) {
  const d = y - lastY; lastY = y;
  if (y < 80) { hud.classList.remove("hide"); acc = 0; return; }
  acc = Math.sign(d) === Math.sign(acc) ? acc + d : d;
  if (acc > 24) hud.classList.add("hide"); else if (acc < -24) hud.classList.remove("hide");
}
if ("IntersectionObserver" in window) {
  const io = new IntersectionObserver((es) => es.forEach((x) => { const a = navs.find((n) => n.dataset.sec === x.target.id); if (a) a.classList.toggle("on", x.isIntersecting); }), { rootMargin: "-45% 0px -45% 0px" });
  ["work", "ping"].forEach((id) => io.observe($(id)));
}
hud.addEventListener("focusin", () => hud.classList.remove("hide"));

// ---- scroll scene: hero exit, sticky repo stage, the bridge slit, the 4:5 window in contacts
const hero = $("top"), bridge = $("bridge"), ping = $("ping"), win = $("win"), stage = document.querySelector(".stage");
const pjs = [...document.querySelectorAll(".pj")];
let lastClip = "", lastSh = -1, lastNk = "", cur = 0;
// window tween: 0 = slit, 1 = 4:5 frame; time-based 900 ms io easing
let wt = 0, wdir = 0, wPrev = 0;
const ioE = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
function frame(now) {
  const W = innerWidth, H = innerHeight, mob = W <= 820, y = S.lenis ? S.lenis.scroll : scrollY;
  hudTick(y);
  const max = document.documentElement.scrollHeight - H; progB.style.transform = `scaleY(${clamp(y / Math.max(1, max)).toFixed(4)})`;
  // hero exit
  const hp = pinned(hero), k = RM ? 0 : ease.out(clamp(hp / 0.85));
  const nk = `translateY(-100%) translate3d(0,${(-k * 30).toFixed(2)}vh,0) scale(${(1 - 0.08 * k).toFixed(4)})|${(1 - clamp((hp - 0.55) / 0.35)).toFixed(3)}`;
  if (nk !== lastNk) { lastNk = nk; const [tr, op] = nk.split("|"); nickEl.style.transform = tr; nickEl.style.opacity = op; }
  if (!RM && hp < 1) {
    px += (pxT - px) * 0.06; py += (pyT - py) * 0.06;
    const pk = `translate3d(${(px * 6).toFixed(2)}px,${(py * 6).toFixed(2)}px,0)`;
    if (pk !== lastPx) { lastPx = pk; nickIn.style.transform = pk; }
    nickFrame(now);
  }
  let sh = 0.45 + 0.4 * k, clip = "inset(0px 0px 0px 0px)";
  v.style.transform = RM ? "" : `scale(${(1 + 0.05 * k).toFixed(4)})`;
  // bridge: full screen -> 2px slit
  const br = bridge.getBoundingClientRect();
  if (br.top < H) {
    const bp = clamp(-br.top / Math.max(1, br.height - H)), e = ease.io(bp);
    sh = lerp(0.85, 0.35, ease.out(clamp((H - br.top) / H)));
    const half = lerp(0, H / 2 - 1, e); clip = `inset(${half.toFixed(1)}px 0px ${half.toFixed(1)}px 0px)`;
    // contacts window
    const pr = ping.getBoundingClientRect(), want = pr.top < H * 0.72 ? 1 : 0;
    const dt = Math.min(64, now - (wPrev || now)); wPrev = now;
    if (RM) wt = want; else if (want > wt) wt = Math.min(1, wt + dt / 900); else if (want < wt) wt = Math.max(0, wt - dt / 900);
    if (wt > 0 && bp >= 1) {
      const r = win.getBoundingClientRect(), q = ioE(wt);
      const slit = [H / 2 - 1, 0, H / 2 - 1, 0], tgt = [r.top, W - r.right, H - r.bottom, r.left];
      const ins = slit.map((s, i) => lerp(s, tgt[i], q).toFixed(1) + "px");
      clip = `inset(${ins.join(" ")} round ${(4 * q).toFixed(1)}px)`; sh = lerp(0.35, 0.2, q);
    }
  } else { wPrev = now; wt = 0; }
  if (clip !== lastClip) { lastClip = clip; vbox.style.clipPath = clip; vbox.style.webkitClipPath = clip; }
  if (Math.abs(sh - lastSh) > 0.002) { lastSh = sh; shade.style.opacity = sh.toFixed(3); }
  // repo stage: swap when the second project's text crosses the middle
  if (!mob && pjs[1]) {
    const n = pjs[1].getBoundingClientRect().top < H * 0.5 ? 1 : 0;
    if (n !== cur) { cur = n; stage.classList.toggle("s1", n === 1); }
  }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// ---- cursor: ring over media
cursor($("cur"), $("curT"), { k: 0.28 });
document.addEventListener("pointerover", (e) => { const c = $("cur"); if (c) c.classList.toggle("ring", !!(e.target.closest && e.target.closest("[data-ring]"))); });

copies();
pushedDates();
smooth(0.08);
$("toTop").addEventListener("click", () => { setTimeout(typeNick, RM ? 0 : 900); });

// ---- Discord: the profile card lives inline in the contacts column (pop.js)
watch(popUpdate);
