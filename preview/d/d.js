import { watch, firstImage, dominant, lastSeen, startTicker, tickTimes, copyButtons, scramble, h, fmt, ago, STATUS_RU } from "../shared/presence.js";

const $ = (id) => document.getElementById(id);
const REDUCE = matchMedia("(prefers-reduced-motion: reduce)").matches;
const FINE = matchMedia("(hover:hover) and (pointer:fine)").matches;
const root = document.documentElement;

/* ---------- accent per section (home follows the cover colour) ---------- */
const hex = (s) => { const n = parseInt(s.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
const HOME0 = "#D8D2C4";
let homeAcc = HOME0, curSec = "now";
const accFor = (sec) => sec === "now" ? homeAcc : document.getElementById(sec).dataset.acc;
function setAcc() { const a = accFor(curSec); root.style.setProperty("--acc", a); field.target(hex(a)); }
function liftColour([r, g, b]) {           // keep hue, force a readable light tint on #080808
  r /= 255; g /= 255; b /= 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l0 = (mx + mn) / 2, d = mx - mn;
  let hh = 0; if (d) hh = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  hh = (hh * 60 + 360) % 360; const s = Math.min(.62, d ? d / (1 - Math.abs(2 * l0 - 1)) : 0), l = Math.max(.7, Math.min(.8, l0 + .25));
  const c = (1 - Math.abs(2 * l - 1)) * s, x = c * (1 - Math.abs(((hh / 60) % 2) - 1)), m = l - c / 2;
  const [R, G, B] = hh < 60 ? [c, x, 0] : hh < 120 ? [x, c, 0] : hh < 180 ? [0, c, x] : hh < 240 ? [0, x, c] : hh < 300 ? [x, 0, c] : [c, 0, x];
  return "#" + [R, G, B].map((v) => Math.round((v + m) * 255).toString(16).padStart(2, "0")).join("");
}

/* ---------- glyph field: dim grid, typing heads with fading trails, a lamp under the cursor ---------- */
const NOISE = "абвгдежзийклмнопрстуфхцчшщъыьэюяё.,:;'";
const field = (() => {
  const cv = $("field"), g = cv.getContext("2d"), st = document.createElement("canvas"), sg = st.getContext("2d");
  let W = 0, H = 0, dpr = 1, cw = 11, chh = 18, cols = 0, rows = 0, ch = null, base = null, br = null, fieldH = 0;
  const extra = new Map();
  let writers = [], words = ["relocpe"], acc = [216, 210, 196], tgt = acc.slice(), raf = 0, last = 0, t0 = 0;
  const mouse = { x: -999, y: -999, sx: -999, sy: -999, on: false };
  const rnd = (a, b) => a + Math.random() * (b - a);
  const FONT = () => `${cw >= 11 ? 12 : 11}px "JetBrains Mono", ui-monospace, monospace`;
  function size() {
    dpr = Math.min(devicePixelRatio || 1, 2); W = innerWidth; H = innerHeight;
    cw = W < 720 ? 10 : 11; chh = W < 720 ? 17 : 18;
    cols = Math.ceil(W / cw); rows = Math.ceil(H / chh) + 1; fieldH = rows * chh;
    cv.width = W * dpr; cv.height = H * dpr;
    extra.clear(); const n = cols * rows; ch = new Uint8Array(n); base = new Float32Array(n); br = new Float32Array(n);
    for (let i = 0; i < n; i++) { ch[i] = (Math.random() * NOISE.length) | 0; base[i] = Math.random() < .42 ? 0 : rnd(.03, .08); }
    st.width = W * dpr; st.height = fieldH * dpr; sg.setTransform(dpr, 0, 0, dpr, 0, 0);
    sg.clearRect(0, 0, W, fieldH); sg.font = FONT(); sg.textBaseline = "middle"; sg.fillStyle = "#F2F1EE";
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) { const i = r * cols + c; if (base[i]) { sg.globalAlpha = base[i]; sg.fillText(NOISE[ch[i]], c * cw, r * chh + chh / 2); } }
    sg.globalAlpha = 1;
    writers = []; const nW = Math.max(4, Math.round((cols * rows) / 1400));
    for (let k = 0; k < nW; k++) writers.push(spawn(true));
  }
  function spawn(first) {
    const msg = Math.random() < .3 ? words[(Math.random() * words.length) | 0] : "";
    const len = msg ? msg.length + 6 : (rnd(8, 46) | 0), c0 = (rnd(-10, cols - 4) | 0);
    return { r: (Math.random() * rows) | 0, c: first ? c0 + rnd(0, 20) : c0, c0, end: c0 + len, v: rnd(14, 34), msg, delay: first ? rnd(0, 1.2) : rnd(.1, 1.6), last: -1 };
  }
  const offset = () => (REDUCE ? 0 : (scrollY * .22) % fieldH);
  function frame(t) {
    raf = 0; const dt = Math.min(.05, last ? (t - last) / 1000 : .016); last = t;
    for (let k = 0; k < 3; k++) acc[k] += (tgt[k] - acc[k]) * (1 - Math.exp(-dt * 4));
    const decay = Math.exp(-dt / 1.1);
    for (let i = 0; i < br.length; i++) if (br[i] > .003) br[i] *= decay; else br[i] = 0;
    const heads = [];
    for (let k = 0; k < writers.length; k++) {
      const w = writers[k];
      if (w.delay > 0) { w.delay -= dt; continue; }
      w.c += w.v * dt; const c = Math.floor(w.c);
      if (c > w.last) {
        for (let cc = Math.max(w.last + 1, 0); cc <= Math.min(c, cols - 1); cc++) {
          const i = w.r * cols + cc, mi = cc - w.c0 - 3;
          if (w.msg && mi >= 0 && mi < w.msg.length) { const ix = NOISE.indexOf(w.msg[mi]); ch[i] = ix >= 0 ? ix : 255; if (ix < 0) extra.set(i, w.msg[mi]); }
          else ch[i] = (Math.random() * NOISE.length) | 0;
          br[i] = 1;
        }
        w.last = c;
      }
      if (c >= w.end || c >= cols) { writers[k] = spawn(false); continue; }
      if (c >= 0) heads.push([w.r, c, w]);
    }
    if (mouse.on) { mouse.sx += (mouse.x - mouse.sx) * (1 - Math.exp(-dt * 10)); mouse.sy += (mouse.y - mouse.sy) * (1 - Math.exp(-dt * 10)); }
    draw(heads);
    if (!document.hidden) raf = requestAnimationFrame(frame);
  }
  function draw(heads) {
    const off = offset();
    g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, cv.width, cv.height);
    g.globalAlpha = 1;
    g.drawImage(st, 0, -off * dpr); if (fieldH - off < H) g.drawImage(st, 0, (fieldH - off) * dpr);
    if (REDUCE) return;
    g.setTransform(dpr, 0, 0, dpr, 0, 0); g.font = FONT(); g.textBaseline = "middle";
    const col = `rgb(${acc.map(Math.round).join(",")})`; g.fillStyle = col;
    const yOf = (r) => { let y = r * chh - off; if (y < -chh) y += fieldH; return y + chh / 2; };
    for (let i = 0; i < br.length; i++) {
      const b = br[i]; if (b < .02) continue;
      const r = (i / cols) | 0, c = i - r * cols; const y = yOf(r); if (y < -chh || y > H + chh) continue;
      g.globalAlpha = Math.min(1, b * .65); g.fillText(ch[i] === 255 ? extra.get(i) || "·" : NOISE[ch[i]], c * cw, y);
    }
    if (mouse.on && FINE) {             // lamp: glyphs light up around the cursor
      const R = 120, my = mouse.sy + off, r0 = Math.max(0, Math.floor((my - R) / chh)), r1 = Math.min(rows - 1, Math.ceil((my + R) / chh));
      const c0 = Math.max(0, Math.floor((mouse.sx - R) / cw)), c1 = Math.min(cols - 1, Math.ceil((mouse.sx + R) / cw));
      for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) {
        const i = r * cols + c; if (!base[i] && !br[i]) continue;
        const dx = c * cw + cw / 2 - mouse.sx, dy = r * chh + chh / 2 - my, d = Math.sqrt(dx * dx + dy * dy); if (d > R) continue;
        const a = Math.pow(1 - d / R, 2) * .55; if (a < .03) continue;
        g.globalAlpha = a; g.fillText(ch[i] === 255 ? extra.get(i) || "·" : NOISE[ch[i]], c * cw, yOf(r));
      }
    }
    g.fillStyle = "#F2F1EE";
    for (const [r, c] of heads) { const i = r * cols + c; const y = yOf(r); g.globalAlpha = 1; g.fillText(ch[i] === 255 ? extra.get(i) || "·" : NOISE[ch[i]], c * cw, y); }
    g.globalAlpha = 1;
  }
  function kick() { if (!raf && !document.hidden) { last = 0; raf = requestAnimationFrame(frame); } }
  return {
    async start() {
      try { await Promise.race([document.fonts.load('12px "JetBrains Mono"'), new Promise((r) => setTimeout(r, 1500))]); } catch {}
      size(); draw([]);
      cv.animate([{ opacity: 0 }, { opacity: 1 }], { duration: REDUCE ? 1 : 1200, easing: "ease-out" });
      let rt; addEventListener("resize", () => { clearTimeout(rt); rt = setTimeout(() => { if (Math.abs(innerWidth - W) > 1 || Math.abs(innerHeight - H) > 120) { size(); } draw([]); kick(); }, 150); });
      if (REDUCE) { addEventListener("scroll", () => draw([]), { passive: true }); return; }
      document.addEventListener("visibilitychange", kick);
      if (FINE) {
        addEventListener("pointermove", (e) => { mouse.x = e.clientX; mouse.y = e.clientY; if (!mouse.on) { mouse.on = true; mouse.sx = e.clientX; mouse.sy = e.clientY; } }, { passive: true });
        document.addEventListener("pointerleave", () => { mouse.on = false; });
      }
      kick();
    },
    target(c) { tgt = c; },
    words(list) { words = list.filter(Boolean).map((s) => s.toLowerCase().slice(0, 60)); },
  };
})();

/* ---------- header string: bends under the cursor, rings when released ---------- */
(() => {
  const svg = $("string"), path = $("strPath");
  let w = 0, cx = 0, y = 0, v = 0, held = false, raf = 0, tyHeld = 0;
  const MID = 20;
  const put = () => path.setAttribute("d", `M0,${MID} Q${cx.toFixed(1)},${(MID + y * 2).toFixed(2)} ${w},${MID}`);
  const measure = () => { const r = svg.getBoundingClientRect(); w = r.width; svg.setAttribute("viewBox", `0 0 ${w} 40`); if (!cx) cx = w / 2; put(); return r; };
  let rect = measure(); addEventListener("resize", () => { rect = measure(); });
  let lt = 0;
  const step = (t) => {
    const dt = Math.min(.033, lt ? (t - lt) / 1000 : .016); lt = t;
    if (held) { y += (tyHeld - y) * (1 - Math.exp(-dt * 30)); v = 0; }
    else { const a = -420 * y - 5 * v; v += a * dt; y += v * dt; }
    put();
    if (held || Math.abs(y) > .02 || Math.abs(v) > .05) raf = requestAnimationFrame(step); else { y = 0; v = 0; put(); raf = 0; lt = 0; }
  };
  const go = () => { if (!raf) raf = requestAnimationFrame(step); };
  window.pluck = (amt = 6) => { if (REDUCE) return; v += amt * 30; cx = w * (.3 + Math.random() * .4); go(); };
  if (REDUCE || !FINE) return;
  addEventListener("pointermove", (e) => {
    const x = e.clientX - rect.left, dy = e.clientY - (rect.top + MID);
    const near = x > 0 && x < w && Math.abs(dy) < 18;
    if (near) { held = true; cx = x; tyHeld = Math.max(-7, Math.min(7, dy / 2)); go(); }
    else if (held) { held = false; v = (tyHeld - 0) * 8; go(); }
  }, { passive: true });
})();

/* ---------- hover scramble on links (same glyph widths, mono) ---------- */
const SC = "абвгдежзиклмнопрстуфхцчшэюя./:;_";
function scrambleText(el) {
  if (REDUCE || el._run) return;
  const txt = el.dataset.txt || (el.dataset.txt = el.textContent); el._run = true; el.setAttribute("aria-label", txt);
  const t0 = performance.now(); let lastT = 0;
  const loop = (t) => {
    if (t - lastT < 45) return requestAnimationFrame(loop); lastT = t;
    const p = (t - t0) / 380; let out = "";
    for (let i = 0; i < txt.length; i++) out += txt[i] === " " || i < p * txt.length ? txt[i] : SC[(Math.random() * SC.length) | 0];
    el.textContent = out;
    if (p < 1) requestAnimationFrame(loop); else { el.textContent = txt; el._run = false; }
  };
  requestAnimationFrame(loop);
}
document.querySelectorAll("[data-sc]").forEach((el) => {
  const host = el.closest("a,button") || el;
  host.addEventListener("pointerenter", () => scrambleText(el));
  host.addEventListener("focus", () => scrambleText(el));
});

/* ---------- cursor hint + Ya screenshot peek (spring followers) ---------- */
function follower(el, dx, dy, k = .2, damp = .62) {
  let x = -999, y = -999, vx = 0, vy = 0, tx = 0, ty = 0, raf = 0, on = false;
  const step = () => {
    vx = (vx + (tx - x) * k) * damp; vy = (vy + (ty - y) * k) * damp; x += vx; y += vy;
    el.style.transform = `translate3d(${x.toFixed(1)}px,${y.toFixed(1)}px,0)`;
    raf = on || Math.abs(vx) + Math.abs(vy) > .1 ? requestAnimationFrame(step) : 0;
  };
  return {
    move(e) { tx = e.clientX + dx; ty = Math.min(innerHeight - (el.offsetHeight || 0) - 12, e.clientY + dy); if (x < -500) { x = tx; y = ty; } if (!raf) raf = requestAnimationFrame(step); },
    show(b) { on = b; el.classList.toggle("on", b); if (b && !raf) raf = requestAnimationFrame(step); },
  };
}
if (FINE) {
  const hint = follower($("hint"), 16, 14, .3, .55), peek = follower($("peek"), 28, -130, .14, .7), ht = $("hintTxt");
  addEventListener("pointermove", (e) => { hint.move(e); peek.move(e); }, { passive: true });
  document.querySelectorAll("[data-hint]").forEach((a) => {
    a.addEventListener("pointerenter", () => { ht.textContent = a.dataset.hint; hint.show(true); if (a.dataset.media) peek.show(true); });
    a.addEventListener("pointerleave", () => { hint.show(false); peek.show(false); });
  });
}

/* ---------- sections: reveal, nav state, accent, space key ---------- */
const secs = [...document.querySelectorAll(".sec")], navs = [...document.querySelectorAll(".nav a")];
const KEY = { now: "пробел: проекты", work: "пробел: связь", ping: "пробел: наверх" };
const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) e.target.classList.add("in"); }), { threshold: .2 });
secs.forEach((s) => io.observe(s));
function pickSection() {
  const mid = innerHeight * .5; let best = secs[0];
  for (const s of secs) { const r = s.getBoundingClientRect(); if (r.top <= mid) best = s; }
  if (innerHeight + scrollY >= document.documentElement.scrollHeight - 4) best = secs[secs.length - 1];
  if (best.id !== curSec) { curSec = best.id; navs.forEach((a) => a.classList.toggle("on", a.dataset.sec === curSec)); setAcc(); window.pluck && window.pluck(3); $("keyTxt").textContent = KEY[curSec]; }
}
let sq = 0; addEventListener("scroll", () => { if (!sq) sq = requestAnimationFrame(() => { sq = 0; pickSection(); }); }, { passive: true });
$("keyTxt").textContent = KEY.now;
addEventListener("keydown", (e) => {
  if (e.code !== "Space" || e.target.closest("a,button,input,textarea,select,[contenteditable]")) return;
  e.preventDefault(); const i = secs.findIndex((s) => s.id === curSec); const nx = secs[(i + 1) % secs.length];
  nx === secs[0] ? scrollTo({ top: 0, behavior: REDUCE ? "auto" : "smooth" }) : nx.scrollIntoView({ behavior: REDUCE ? "auto" : "smooth", block: innerWidth < 720 ? "start" : "center" });
});

/* ---------- live Discord ---------- */
const stage = $("stage"), also = $("also");
const KIND = { music: "слушает", game: "играет", ide: "пишет код", other: "сейчас" };
const BARN = 22;
function cover(srcs, alt) {
  const c = h("div", "cov");
  if (srcs && srcs.length) {
    const im = h("img"); im.alt = alt; im.decoding = "async"; im.width = im.height = 512; im.crossOrigin = "anonymous"; c.appendChild(im);
    firstImage(srcs).then((u) => { if (u) { if (!u.includes("workers.dev")) im.removeAttribute("crossorigin"); im.src = u; } else im.remove(); });
  }
  return c;
}
function idleCover() {
  const c = h("div", "cov idle"); let s = "";
  for (let r = 0; r < 6; r++) { for (let k = 0; k < 8; k++) s += Math.random() < .35 ? " " : NOISE[(Math.random() * 33) | 0]; s += r < 5 ? "\n" : ""; }
  c.textContent = s; c.setAttribute("aria-hidden", "true"); return c;
}
function progress(a) {
  const p = h("p", "prog"); p.dataset.ps = a.start; p.dataset.pe = a.end; p.setAttribute("aria-hidden", "true");
  p.append(h("span", "cur", "0:00"), " ", h("span", "bar"), " ", h("span", "tot", fmt(a.end - a.start)));
  return p;
}
function tickProg() {
  const now = Date.now();
  document.querySelectorAll(".prog").forEach((p) => {
    const s = +p.dataset.ps, e = +p.dataset.pe, f = Math.max(0, Math.min(1, (now - s) / (e - s))), n = Math.round(f * BARN);
    p.querySelector(".cur").textContent = fmt(Math.min(now, e) - s);
    const bar = p.querySelector(".bar"); bar.innerHTML = ""; bar.append("━".repeat(n)); const i = document.createElement("i"); i.textContent = "─".repeat(BARN - n); bar.appendChild(i);
  });
}
setInterval(() => { if (!document.hidden) tickProg(); }, 1000);

function view(m) {
  const el = h("div", "np"), meta = h("div", "meta"), acts = m.activities || [];
  const main = acts.find((a) => a.kind === "music") || acts.find((a) => a.kind === "game" || a.kind === "ide") || acts[0];
  const on = m.live && m.status !== "offline";
  let key, art = null, words = [], ago_ = "";
  if (on && main) {
    key = main.key + main.title + main.start; art = main.art;
    el.appendChild(main.art.length ? cover(main.art, main.kind === "music" ? `Обложка: ${main.title}` : main.app) : idleCover());
    meta.append(h("p", "k", KIND[main.kind]), h("p", "t", main.title), h("p", "a", main.sub));
    if (main.kind === "music" && main.end > main.start) meta.appendChild(progress(main));
    else if (main.start) { const e = h("p", "el"); const s = h("span"); s.dataset.start = main.start; e.append(main.kind === "game" ? "в игре " : "уже ", s); meta.appendChild(e); }
    words = [main.title, main.sub];
  } else if (on) {
    key = "on-idle"; el.appendChild(idleCover());
    meta.append(h("p", "k", STATUS_RU[m.status] || "в сети"), h("p", "t", m.custom || "Ничего не запущено"), h("p", "a", "Discord открыт, музыка на паузе"));
  } else {
    const ls = lastSeen(m);
    if (ls && ls.act) {
      key = "past" + ls.at; el.classList.add("past"); art = ls.act.art;
      el.appendChild(ls.act.art && ls.act.art.length ? cover(ls.act.art, `Обложка: ${ls.act.title}`) : idleCover());
      meta.append(h("p", "k", ls.act.kind === "music" ? "последний трек" : "последнее"), h("p", "t", ls.act.title), h("p", "a", ls.act.sub || ""));
      ago_ = ls.at; words = [ls.act.title];
    } else {
      key = "idle" + (m.live ? "" : "-load"); el.appendChild(idleCover());
      meta.append(h("p", "k", m.live ? "сейчас тихо" : "подключаюсь"), h("p", "t", m.live ? "Ничего не играет" : "Секунду"),
        h("p", "note", m.live ? "Когда я что-то слушаю или запускаю, здесь будет обложка, трек и время." : "Статус идёт через свой прокси, обычно меньше секунды."));
    }
  }
  el.appendChild(meta);
  return { el, key, art, words, ago_, mainKey: on && main ? main.key : "" };
}

let curKey = "", tintTok = 0;
function render(m) {
  const on = m.live && m.status !== "offline";
  $("dot").dataset.s = m.live ? m.status : "unknown";
  $("stTxt").textContent = m.live ? `discord · ${STATUS_RU[m.status] || "в сети"}` : "discord";
  $("nowLbl").textContent = m.live ? `discord · ${STATUS_RU[m.status] || "в сети"}` : "discord";
  const v = view(m), ar = $("nowAgo");
  if (v.ago_) { ar.dataset.ago = v.ago_; ar.textContent = ago(v.ago_); } else { delete ar.dataset.ago; ar.textContent = on ? "сейчас" : ""; }
  if (v.key !== curKey) {
    curKey = v.key; const old = [...stage.children];
    v.el.style.opacity = "0"; stage.appendChild(v.el);
    requestAnimationFrame(() => requestAnimationFrame(() => { v.el.style.opacity = "1"; old.forEach((o) => { o.style.opacity = "0"; o.setAttribute("aria-hidden", "true"); }); }));
    setTimeout(() => old.forEach((o) => o.remove()), 340);
    tickProg(); tickTimes(stage); tint(v.art);
    field.words(["relocpe", ...v.words, "ya.music-rpc", "nimbus"]);
  } else {
    const ts = stage.lastElementChild && stage.lastElementChild.querySelector(".prog"), nt = v.el.querySelector(".prog");
    if (ts && nt) { ts.dataset.ps = nt.dataset.ps; ts.dataset.pe = nt.dataset.pe; }
  }
  const rest = on ? m.activities.filter((a) => a.key !== v.mainKey) : [];
  also.replaceChildren(...rest.map((a) => {
    const li = h("li"), n = h("span", "n");
    n.append(a.kind === "music" ? a.title : a.app); if (a.sub) n.append(h("span", "", " · " + a.sub));
    const t = h("span", "tm"); if (a.start) t.dataset.start = a.start;
    li.append(h("span", "k2", KIND[a.kind]), n, t); return li;
  }));
  tickTimes(also);
}
async function tint(srcs) {
  const my = ++tintTok;
  const u = srcs && srcs.length ? await firstImage(srcs.filter((s) => s.includes("workers.dev"))) : "";
  const c = u ? await dominant(u) : null;
  if (my !== tintTok) return;
  homeAcc = c ? liftColour(c) : HOME0; if (curSec === "now") setAcc();
}

scramble($("nick"), { hover: true });
copyButtons();
startTicker(document);
setAcc();
field.start();
render({ live: false, status: "unknown", avatar: [], activities: [] });
watch(render);
pickSection();
