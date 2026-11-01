import { $, RM, COARSE, clamp, lerp, ease, S, bgVideo, sound, smooth, through, pinned, cursor, copies, chars, pushedDates, watch, lastSeen, coverImg, tickTimes, startTicker, h, ago } from "./core.js";

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
const nickT = $("nickT"), caret = $("caret"), nickEl = $("nick"); chars(nickT); nickT.removeAttribute("aria-label");
let typing = [];
function typeNick() {
  typing.forEach(clearTimeout); typing = []; caret.classList.remove("dim");
  const cs = [...nickT.children];
  if (RM) { cs.forEach((c) => c.classList.add("on")); return; }
  cs.forEach((c) => c.classList.remove("on"));
  cs.forEach((c, i) => typing.push(setTimeout(() => c.classList.add("on"), 80 + i * 45)));
  typing.push(setTimeout(() => caret.classList.add("dim"), 80 + cs.length * 45 + 3000));
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
const hero = $("top"), bridge = $("bridge"), ping = $("ping"), win = $("win"), stage = document.querySelector(".stage"), caps = [...document.querySelectorAll(".stage-c span")];
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
    if (n !== cur) { caps[cur].classList.remove("on"); caps[cur].classList.toggle("up", n > cur); cur = n; caps[n].classList.remove("up"); caps[n].classList.add("on"); stage.classList.toggle("s1", n === 1); }
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

// ---- Discord ticker: one line, never empty
const tk = $("tk"), WORD = { online: "в сети", idle: "отошёл", dnd: "не беспокоить", offline: "не в сети" }, KIND = { music: "слушаю", game: "играю", ide: "пишу код", other: "запущено" };
let tkKey = "";
const clean = (t) => String(t || "").replace(/[\p{Extended_Pictographic}\u{FE0F}\u{200D}\u{20E3}]/gu, "").replace(/\s{2,}/g, " ").trim();
function row(dotS, parts, opts = {}) {
  const r = h("div", "tk-r"), cv = h("span", "tk-cv"), l = h("div", "tk-l");
  if (opts.track) r.dataset.track = "";
  if (dotS) { const d = h("span", "dot"); d.dataset.s = dotS; l.appendChild(d); }
  parts.forEach(([cls, txt, data]) => { const s = h("span", cls, clean(txt)); if (data) Object.assign(s.dataset, data); l.appendChild(s); });
  const hasArt = opts.art && opts.art.length;
  if (!hasArt) r.classList.add("na");
  r.append(...(hasArt ? [cv, l] : [l]));
  if (opts.track) { const b = h("i", "tk-bar"), bb = h("b"); bb.dataset.bar = ""; b.appendChild(bb); r.appendChild(b); }
  if (hasArt) coverImg(opts.art, opts.alt || "").then((im) => { if (im) cv.appendChild(im); else cv.classList.add("none"); });
  return r;
}
function renderTk(m) {
  const acts = m.live ? (m.activities || []) : [], on = m.live && m.status !== "offline";
  const music = acts.find((a) => a.kind === "music"), other = acts.find((a) => a !== music && a.kind !== "music");
  const ls = lastSeen(m);
  const key = JSON.stringify([m.live, m.status, music && [music.title, music.start, music.end], other && [other.app, other.start], !on && ls && ls.at, m.name ? 1 : 0]);
  if (key === tkKey) return; tkKey = key;
  const rows = [];
  if (!m.live && !m.name) rows.push(row("", [["", "подключаюсь к Discord…"]]));
  else if (on) {
    const st = m.status;
    if (music) {
      const ps = [["", KIND.music], ["tk-t", `${music.title}${music.sub ? " — " + music.sub : ""}`]];
      if (music.end > music.start) ps.push(["tk-tm", "", { start: music.start, end: music.end }]);
      rows.push(row(st, ps, { track: music.end > music.start, art: music.art, alt: `Обложка: ${music.title}` }));
    }
    if (other) { const ps = [["", KIND[other.kind] || "запущено"], ["tk-t", other.app + (other.sub ? " · " + other.sub : "")]]; if (other.start) ps.push(["tk-tm", "", { start: other.start }]); rows.push(row(music ? "" : st, ps, { art: other.art, alt: other.app })); }
    if (!rows.length) rows.push(row(st, [["tk-t", WORD[st] || "в сети"], ["", "· ничего не запущено"]]));
  } else {
    const was = ls ? `был ${ago(ls.at)}` : "";
    const ps = [["tk-t", m.live ? "не в сети" : "Discord не ответил"]]; if (was) ps.push(["", "· " + was, ls ? { ago: ls.at } : null]);
    rows.push(row("offline", ps));
    if (ls && ls.act && ls.act.title) rows.push(row("", [["", ls.act.kind === "music" ? "последний трек" : "последнее"], ["tk-t", ls.act.title + (ls.act.sub ? " — " + ls.act.sub : "")]], { art: ls.act.art, alt: `Обложка: ${ls.act.title}` }));
  }
  tk.replaceChildren(...rows); tickTimes(tk);
  tk.querySelectorAll("[data-ago]").forEach((e) => { const at = +e.dataset.ago; e.removeAttribute("data-ago"); e.dataset.was = at; e.textContent = "· был " + ago(at); });
}
renderTk({ live: false, status: "unknown", activities: [] });
watch(renderTk); startTicker(tk);
setInterval(() => tk.querySelectorAll("[data-was]").forEach((e) => { e.textContent = "· был " + ago(+e.dataset.was); }), 60000);
