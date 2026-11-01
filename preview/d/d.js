import { watch, firstImage, dominant, lastSeen, startTicker, tickTimes, copyButtons, scramble, h, fmt, ago, STATUS_RU } from "../shared/presence.js";

const $ = (id) => document.getElementById(id);
const REDUCE = matchMedia("(prefers-reduced-motion: reduce)").matches;
const FINE = matchMedia("(hover:hover) and (pointer:fine)").matches;
const root = document.documentElement;

/* ---------- accent per section (home follows the cover colour) ---------- */
const hex = (s) => { const n = parseInt(s.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
const HOME0 = "#D8D2C4";
let homeAcc = HOME0, curSec = "work";
const accFor = (sec) => document.getElementById(sec).dataset.acc;
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

/* ---------- background: domain-warped ink, ordered-dithered, lit by the cursor (WebGL) ---------- */
const field = (() => {
  const cv = $("bg"); let gl = null;
  try { gl = cv.getContext("webgl", { antialias: false, alpha: false, powerPreference: "low-power", preserveDrawingBuffer: false }); } catch {}
  let acc = [216, 210, 196], tgt = acc.slice(), raf = 0, last = 0, T = Math.random() * 100, scale = .5;
  const m = { x: innerWidth * .72, y: innerHeight * .3, sx: innerWidth * .72, sy: innerHeight * .3, on: 0, l: 0, user: false };
  if (!gl) return { start() {}, target(c) {}, words() {} };
  const VS = "attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}";
  const HP = gl.getShaderPrecisionFormat(gl.FRAGMENT_SHADER, gl.HIGH_FLOAT);
  const FS = `precision ${HP && HP.precision > 0 ? "highp" : "mediump"} float;
uniform vec2 R;uniform float T;uniform vec2 M;uniform float L;uniform vec3 A;uniform float S;
float h(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}
float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
 return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y);}
float fb(vec2 p){float v=0.,a=.5;mat2 r=mat2(.8,.6,-.6,.8);for(int i=0;i<4;i++){v+=a*n(p);p=r*p*2.03;a*=.5;}return v;}
float b2(vec2 a){a=floor(a);return fract(dot(a,vec2(.5,a.y*.75)));}
float b4(vec2 a){return b2(.5*a)*.25+b2(a);}
float b8(vec2 a){return b4(.5*a)*.25+b2(a);}
void main(){
 vec2 fc=gl_FragCoord.xy;vec2 uv=fc/R.y;uv.y+=S;float t=T*.035;
 vec2 q=vec2(fb(uv*1.4+vec2(0.,t)),fb(uv*1.4+vec2(5.2,1.3)-t));
 vec2 r=vec2(fb(uv*1.4+2.6*q+vec2(1.7,9.2)+t*1.4),fb(uv*1.4+2.6*q+vec2(8.3,2.8)-t*.9));
 float v=fb(uv*1.4+2.8*r);
 float ink=smoothstep(.42,.92,v);
 vec2 d=(fc-M)/R.y;float li=exp(-dot(d,d)*9.)*L;
 float vig=smoothstep(1.25,.2,length((fc/R-vec2(.5,.45))*vec2(1.,.8)));
 float lum=min(.58,(ink*.6+li*.4+ink*li*.5)*(.55+.45*vig));
 float dt=step(b8(fc)+.02,lum);
 vec3 bg=vec3(.031);
 vec3 tint=mix(vec3(.22,.22,.21),A*.62,.35+.65*clamp(li*1.6+ink*.4,0.,1.));
 vec3 col=bg+bg*ink*.9+dt*tint*(.45+.75*lum);
 gl_FragColor=vec4(col,1.);
}`;
  const sh = (t, src) => { const s = gl.createShader(t); gl.shaderSource(s, src); gl.compileShader(s); return s; };
  const pr = gl.createProgram(); gl.attachShader(pr, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, FS)); gl.linkProgram(pr);
  if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) { gl = null; return { start() {}, target() {}, words() {} }; }
  gl.useProgram(pr);
  const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(pr, "p"); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  const U = {}; ["R", "T", "M", "L", "A", "S"].forEach((k) => (U[k] = gl.getUniformLocation(pr, k)));
  let W = 0, H = 0;
  function size() {
    scale = .5; W = Math.max(1, Math.round(innerWidth * scale)); H = Math.max(1, Math.round(innerHeight * scale));
    cv.width = W; cv.height = H; gl.viewport(0, 0, W, H);
  }
  function draw() {
    gl.uniform2f(U.R, W, H); gl.uniform1f(U.T, T); gl.uniform2f(U.M, m.sx * scale, (innerHeight - m.sy) * scale);
    gl.uniform1f(U.L, m.l); gl.uniform3f(U.A, acc[0] / 255, acc[1] / 255, acc[2] / 255); gl.uniform1f(U.S, REDUCE ? 0 : scrollY / innerHeight * .35);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }
  let acc30 = 0;
  function frame(t) {
    raf = 0; const dt = Math.min(.05, last ? (t - last) / 1000 : .016); last = t; acc30 += dt;
    if (acc30 >= 1 / 32) {           // ~30 fps is plenty for slow ink
      const st = acc30; acc30 = 0; T += st;
      for (let k = 0; k < 3; k++) acc[k] += (tgt[k] - acc[k]) * (1 - Math.exp(-st * 3));
      if (!m.user) { m.x = innerWidth * (.55 + .3 * Math.sin(T * .13)); m.y = innerHeight * (.4 + .25 * Math.sin(T * .09 + 1)); }
      m.sx += (m.x - m.sx) * (1 - Math.exp(-st * (m.user ? 6 : 1))); m.sy += (m.y - m.sy) * (1 - Math.exp(-st * (m.user ? 6 : 1)));
      m.l += ((m.user ? 1 : .55) - m.l) * (1 - Math.exp(-st * 2));
      draw();
    }
    if (!document.hidden) raf = requestAnimationFrame(frame);
  }
  const kick = () => { if (!raf && !document.hidden && !REDUCE) { last = 0; raf = requestAnimationFrame(frame); } };
  return {
    start() {
      size(); m.l = .55; draw();
      cv.animate([{ opacity: 0 }, { opacity: 1 }], { duration: REDUCE ? 1 : 1400, easing: "ease-out" });
      let rt; addEventListener("resize", () => { clearTimeout(rt); rt = setTimeout(() => { size(); draw(); }, 120); });
      cv.addEventListener("webglcontextlost", (e) => { e.preventDefault(); cancelAnimationFrame(raf); raf = 0; });
      if (REDUCE) { addEventListener("resize", () => draw()); return; }
      document.addEventListener("visibilitychange", kick);
      if (FINE) {
        addEventListener("pointermove", (e) => { m.x = e.clientX; m.y = e.clientY; m.user = true; }, { passive: true });
        document.documentElement.addEventListener("pointerleave", () => { m.user = false; });
      } else addEventListener("pointerdown", (e) => { m.x = e.clientX; m.y = e.clientY; m.user = true; setTimeout(() => (m.user = false), 2500); }, { passive: true });
      kick();
    },
    target(c) { tgt = c; if (REDUCE) { acc = c.slice(); draw(); } },
    words() {},
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
const SC = "!<>-_/[]{}=+*^?#%";
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
  const hint = follower($("hint"), 16, 14, .3, .55), ht = $("hintTxt");
  addEventListener("pointermove", (e) => { hint.move(e); }, { passive: true });
  document.querySelectorAll("[data-hint]").forEach((a) => {
    a.addEventListener("pointerenter", () => { ht.textContent = a.dataset.hint; hint.show(true); });
    a.addEventListener("pointerleave", () => { hint.show(false); });
  });
}

/* ---------- sections: reveal, nav state, accent, space key ---------- */
const secs = [...document.querySelectorAll(".sec")], navs = [...document.querySelectorAll(".nav a")];
const KEY = { work: "пробел: связь", ping: "пробел: наверх" };
const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) e.target.classList.add("in"); }), { threshold: .2 });
secs.forEach((s) => io.observe(s));
function pickSection() {
  const mid = innerHeight * .5; let best = secs[0];
  for (const s of secs) { const r = s.getBoundingClientRect(); if (r.top <= mid) best = s; }
  if (innerHeight + scrollY >= document.documentElement.scrollHeight - 4) best = secs[secs.length - 1];
  if (best.id !== curSec) { curSec = best.id; navs.forEach((a) => a.classList.toggle("on", a.dataset.sec === curSec)); setAcc(); window.pluck && window.pluck(3); $("keyTxt").textContent = KEY[curSec]; }
}
let sq = 0; addEventListener("scroll", () => { if (!sq) sq = requestAnimationFrame(() => { sq = 0; pickSection(); }); }, { passive: true });
$("keyTxt").textContent = KEY.work;
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
  for (let r = 0; r < 6; r++) { for (let k = 0; k < 8; k++) s += Math.random() < .5 ? " " : "·•"[(Math.random() * 2) | 0]; s += r < 5 ? "\n" : ""; }
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
  homeAcc = c ? liftColour(c) : HOME0; $("nowPane").style.setProperty("--acc", homeAcc);
}

scramble($("nick"), { hover: true });
document.querySelectorAll("[data-pushed]").forEach((t) => { const d = (Date.now() - Date.parse(t.dateTime)) / 864e5; if (d >= 0 && d < 60) t.textContent = d < 1 ? "обновлён сегодня" : d < 2 ? "обновлён вчера" : `обновлён ${Math.floor(d)} дн. назад`; t.title = t.dateTime.slice(0, 10); });
copyButtons();
startTicker(document);
setAcc();
field.start();
render({ live: false, status: "unknown", avatar: [], activities: [] });
watch(render);
pickSection();
