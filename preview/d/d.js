import { watch, firstImage, lastSeen, startTicker, tickTimes, copyText, h, fmt, ago, STATUS_RU } from "../shared/presence.js";

const $ = (id) => document.getElementById(id);
const REDUCE = matchMedia("(prefers-reduced-motion: reduce)").matches;
const FINE = matchMedia("(hover:hover) and (pointer:fine)").matches;
const MOBILE = () => innerWidth <= 820;
const root = document.documentElement;
const clamp = (a, x, b) => Math.max(a, Math.min(b, x));

// cubic-bezier(x1,y1,x2,y2) as an easing function (Newton + bisection)
function bezier(x1, y1, x2, y2) {
  const A = (a, b) => 1 - 3 * b + 3 * a, B = (a, b) => 3 * b - 6 * a, C = (a) => 3 * a;
  const f = (t, a, b) => ((A(a, b) * t + B(a, b)) * t + C(a)) * t;
  const d = (t, a, b) => 3 * A(a, b) * t * t + 2 * B(a, b) * t + C(a);
  return (x) => {
    if (x <= 0) return 0; if (x >= 1) return 1;
    let t = x;
    for (let i = 0; i < 6; i++) { const s = d(t, x1, x2); if (Math.abs(s) < 1e-6) break; t -= (f(t, x1, x2) - x) / s; }
    if (t < 0 || t > 1 || Math.abs(f(t, x1, x2) - x) > 1e-4) { let lo = 0, hi = 1; t = x; for (let i = 0; i < 30; i++) { const v = f(t, x1, x2); if (Math.abs(v - x) < 1e-5) break; v < x ? (lo = t) : (hi = t); t = (lo + hi) / 2; } }
    return f(t, y1, y2);
  };
}
const REV_MS = /[?&]revslow/.test(location.search) ? 14000 : 1400; // ?revslow = debug the reveal
const OUT = bezier(.16, 1, .3, 1), IO = bezier(.65, 0, .35, 1);

/* ---------- smooth scroll ---------- */
let lenis = null, vel = 0;
async function smooth() {
  if (REDUCE) return;
  try {
    const { default: Lenis } = await import("./vendor/lenis.mjs");
    lenis = new Lenis({ lerp: .09, smoothWheel: true, anchors: false });
    const raf = (t) => { lenis.raf(t); requestAnimationFrame(raf); };
    requestAnimationFrame(raf);
  } catch { lenis = null; }
}
function goTo(y) {
  if (lenis) lenis.scrollTo(y, { duration: .9, easing: IO, force: true });
  else scrollTo({ top: y, behavior: REDUCE ? "auto" : "smooth" });
}
// scroll velocity in px/s, sampled every frame
{
  let ly = scrollY, lt = performance.now();
  const s = (t) => { const dt = Math.max(1, t - lt); const v = (scrollY - ly) / dt * 1000; vel += (v - vel) * .35; ly = scrollY; lt = t; if (Math.abs(vel) < 1) vel = 0; requestAnimationFrame(s); };
  requestAnimationFrame(s);
}

/* ---------- pointer state shared by shader / cursor / preview ---------- */
const P = { x: innerWidth * .6, y: innerHeight * .5, push: 0, seen: false, rip: [0, 0, -9], vx: 0 };
{
  let lx = 0, ly = 0, lt = 0;
  addEventListener("pointermove", (e) => {
    if (e.pointerType !== "mouse" && e.pointerType !== "pen") return;
    const t = performance.now(), dt = Math.max(8, t - lt);
    const sp = lt ? Math.hypot(e.clientX - lx, e.clientY - ly) / dt * 1000 : 0;
    P.vx = lt ? (e.clientX - lx) / dt * 1000 : 0;
    P.push = Math.max(P.push, clamp(0, sp / 1400, 1));
    lx = P.x = e.clientX; ly = P.y = e.clientY; lt = t; P.seen = true;
  }, { passive: true });
  addEventListener("pointerdown", (e) => { if (e.pointerType === "touch") P.rip = [e.clientX, e.clientY, performance.now() / 1000]; }, { passive: true });
}

/* ---------- ink shader: reveals the nick, reacts to cursor + scroll ---------- */
const field = (() => {
  const cv = $("bg"), nick = $("nick"), nickT = $("nickT");
  const show = () => nick.classList.add("on");
  let gl = null;
  try { gl = cv.getContext("webgl", { antialias: false, alpha: false, powerPreference: "high-performance", premultipliedAlpha: false }); } catch {}
  if (!gl) return { start: show };
  const HP = gl.getShaderPrecisionFormat(gl.FRAGMENT_SHADER, gl.HIGH_FLOAT);
  const VS = "attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}";
  const FS = `precision ${HP && HP.precision > 0 ? "highp" : "mediump"} float;
uniform vec2 R;uniform float K;uniform float T;uniform vec2 M;uniform float PU;uniform vec3 RP;uniform float S;uniform float V;
uniform float REV;uniform float LET;uniform sampler2D MK;uniform vec2 MS;
float h(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}
float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
 return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y);}
float fb(vec2 p){float v=0.,a=.5;mat2 r=mat2(.8,.6,-.6,.8);for(int i=0;i<4;i++){v+=a*n(p);p=r*p*2.03;a*=.5;}return v;}
float b2(vec2 a){a=floor(a);return fract(dot(a,vec2(.5,a.y*.75)));}
float b4(vec2 a){return b2(.5*a)*.25+b2(a);}
float b8(vec2 a){return b4(.5*a)*.25+b2(a);}
void main(){
 vec2 fc=gl_FragCoord.xy;
 vec2 q=vec2(fc.x,R.y-fc.y)/K;              // css px, y down, viewport space
 vec2 d=q-M;float dl=length(d)+1e-3;
 vec2 dir=d/dl;
 vec2 off=dir*PU*exp(-dl*dl/(180.*180.))*24.;
 float rr=(T-RP.z)*640.;float ra=max(0.,1.-(T-RP.z)/1.1);
 off+=dir*ra*exp(-pow((dl-rr)/46.,2.))*22.;
 vec2 q2=q-off;
 float vh=MS.y;
 vec2 uv=vec2(q2.x,-q2.y-S*.3)/vh;float t=T*.035;
 vec2 a=vec2(fb(uv*1.5+vec2(0.,t)),fb(uv*1.5+vec2(5.2,1.3)-t));
 vec2 b=vec2(fb(uv*1.5+2.6*a+vec2(1.7,9.2)+t*1.4),fb(uv*1.5+2.6*a+vec2(8.3,2.8)-t*.9));
 float v=fb(uv*1.5+2.8*b);
 float ink=smoothstep(.5,.95,v);
 vec2 tc=vec2(q2.x/MS.x,(q2.y+S)/vh);
 vec2 tcs=vec2(q.x/MS.x,(q.y+S)/vh);
 float inb=step(0.,tcs.y)*step(tcs.y,1.);
 float halo=texture2D(MK,tc).g*step(0.,tc.y)*step(tc.y,1.);
 float let=texture2D(MK,tcs).r*inb;
 float yN=q.y/vh;float pr=fract(S/vh);
 float band=exp(-pow((yN-(-.15+pr*1.3))*3.2,2.))*sin(3.14159*pr);
 float flow=clamp(REV*1.25-.1,0.,1.);
 float lum=ink*(.27+.25*band)+halo*(.16+.5*ink)*flow+band*v*.12+abs(V)*.00004*ink;
 float vig=smoothstep(1.35,.25,length((q/MS-vec2(.5,.5))*vec2(1.,.9)));
 lum*=.55+.45*vig;
 lum=min(lum,.5);
 float dt=step(b8(fc)+.015,lum*1.7);
 float gray=.18+.36*smoothstep(.08,.45,lum);
 vec3 col=vec3(.031)+vec3(.012)*ink+dt*vec3(gray);
 // letters: ink flows in, 1-bit dither resolves to a clean edge
 float nv=smoothstep(.28,.72,v);
 float delay=.1+.62*nv+.22*clamp(q.x/MS.x,0.,1.);
 float fill=smoothstep(delay-.1,delay,REV*1.06)*let;
 float clean=smoothstep(.72,1.,REV);clean*=clean*clean;
 float l1=step(b4(fc)+.03,fill*(.4+.6*REV));
 float L=mix(l1,fill,clean)*LET;
 col=mix(col,vec3(.93),L);
 gl_FragColor=vec4(col,1.);
}`;
  const sh = (t, src) => { const s = gl.createShader(t); gl.shaderSource(s, src); gl.compileShader(s); return s; };
  const pr = gl.createProgram(); gl.attachShader(pr, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, FS)); gl.linkProgram(pr);
  if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) return { start: show };
  gl.useProgram(pr);
  const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(pr, "p"); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  const U = {}; ["R", "K", "T", "M", "PU", "RP", "S", "V", "REV", "LET", "MK", "MS"].forEach((k) => (U[k] = gl.getUniformLocation(pr, k)));
  const tex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, tex);
  [[gl.TEXTURE_MIN_FILTER, gl.LINEAR], [gl.TEXTURE_MAG_FILTER, gl.LINEAR], [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE]].forEach(([a, b]) => gl.texParameteri(gl.TEXTURE_2D, a, b));
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0, 0, 0, 255]));
  gl.uniform1i(U.MK, 0);

  let QK = 1, slow = 0, nf = 0;   // adaptive quality: drop resolution if frames run long
  let W = 0, H = 0, K = 1, VW = 0, VH = 0, raf = 0, T = Math.random() * 60, rev = 0, letA = 1, revStart = 0, revDone = false, last = 0;
  function size() {
    VW = innerWidth; VH = innerHeight;
    const dpr = devicePixelRatio || 1;
    K = Math.min(QK, MOBILE() ? Math.min(1, dpr * .5) : Math.min(1, Math.sqrt(2.6e6 / (VW * VH))));
    W = Math.max(1, Math.round(VW * K)); H = Math.max(1, Math.round(VH * K));
    cv.width = W; cv.height = H; gl.viewport(0, 0, W, H);
  }
  // mask: R = nick glyphs (laid out exactly where the HTML ones are), G = soft halo
  function mask() {
    const hero = $("hero"), hr = hero.getBoundingClientRect(), mw = Math.max(1, Math.round(VW * K)), mh = Math.max(1, Math.round(hr.height * K));
    const c = document.createElement("canvas"); c.width = mw; c.height = mh;
    const g = c.getContext("2d"); g.fillStyle = "#000"; g.fillRect(0, 0, mw, mh);
    const cs = getComputedStyle(nick), fs = parseFloat(cs.fontSize);
    const font = `${cs.fontWeight} ${fs}px ${cs.fontFamily}`;
    const glyphs = (ctx, k, ox, oy, col) => {
      ctx.font = font.replace(`${fs}px`, `${fs * k}px`); ctx.fillStyle = col; ctx.textBaseline = "alphabetic";
      const m = ctx.measureText("r"), asc = (m.fontBoundingBoxAscent || fs * k * 1.02);
      const node = nickT.firstChild, rg = document.createRange(), txt = node.textContent;
      for (let i = 0; i < txt.length; i++) {
        if (txt[i] === " ") continue;
        rg.setStart(node, i); rg.setEnd(node, i + 1); const r = rg.getBoundingClientRect();
        ctx.fillText(txt[i], (r.left - hr.left) * k + ox, (r.top - hr.top) * k + oy + asc);
      }
    };
    // halo: tiny render, upscaled twice = cheap blur
    const s1 = 1 / 10, a = document.createElement("canvas"); a.width = Math.ceil(mw * s1 / K); a.height = Math.ceil(mh * s1 / K);
    const ga = a.getContext("2d"); ga.fillStyle = "#000"; ga.fillRect(0, 0, a.width, a.height);
    glyphs(ga, s1, 0, 0, "#0f0");
    const b = document.createElement("canvas"); b.width = Math.ceil(a.width / 2); b.height = Math.ceil(a.height / 2);
    const gb = b.getContext("2d"); gb.imageSmoothingEnabled = true; gb.drawImage(a, 0, 0, b.width, b.height);
    ga.clearRect(0, 0, a.width, a.height); ga.fillStyle = "#000"; ga.fillRect(0, 0, a.width, a.height); ga.drawImage(b, 0, 0, a.width, a.height);
    g.imageSmoothingEnabled = true; g.globalCompositeOperation = "lighter";
    g.drawImage(a, -mw * .02, -mh * .03, mw * 1.04, mh * 1.06);
    glyphs(g, K, 0, 0, "#f00");
    g.globalCompositeOperation = "source-over";
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, c);
    return { mw, mh: hr.height };
  }
  let MSz = { mw: 1, mh: 1 };
  function draw() {
    gl.uniform2f(U.R, W, H); gl.uniform1f(U.K, K); gl.uniform1f(U.T, T);
    gl.uniform2f(U.M, P.x, P.y); gl.uniform1f(U.PU, P.push);
    gl.uniform3f(U.RP, P.rip[0], P.rip[1], P.rip[2] - tBase);
    gl.uniform1f(U.S, scrollY); gl.uniform1f(U.V, REDUCE ? 0 : vel);
    gl.uniform1f(U.REV, rev); gl.uniform1f(U.LET, letA);
    gl.uniform2f(U.MS, VW, MSz.mh);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }
  const tBase = performance.now() / 1000 - T;   // T runs on the same clock as tap ripples
  function frame(t) {
    raf = 0;
    const dt = Math.min(.05, last ? (t - last) / 1000 : .016); last = t;
    T = t / 1000 - tBase;
    if (++nf > 20 && QK > .5) { slow = slow * .9 + (dt > .026 ? .1 : 0); if (slow > .6) { QK = Math.max(.5, QK - .25); slow = 0; nf = 0; size(); MSz = mask(); } }
    P.push *= Math.exp(-dt / .6);
    if (!revDone) {
      const p = clamp(0, (t - revStart) / REV_MS, 1); rev = OUT(p);
      if (p >= 1) { revDone = true; show(); const t0 = t; const fade = (tt) => { letA = 1 - clamp(0, (tt - t0) / 500, 1); if (letA > 0) requestAnimationFrame(fade); }; requestAnimationFrame(fade); }
    }
    draw();
    if (!document.hidden) raf = requestAnimationFrame(frame);
  }
  const kick = () => { if (!raf && !document.hidden && !REDUCE) { last = 0; raf = requestAnimationFrame(frame); } };
  return {
    async start() {
      size();
      try { await Promise.race([document.fonts.load(`500 100px "JetBrains Mono"`), new Promise((r) => setTimeout(r, 1500))]); } catch {}
      MSz = mask();
      if (REDUCE) { rev = 1; letA = 0; revDone = true; show(); draw(); }
      else { revStart = performance.now(); kick(); }
      let rt; addEventListener("resize", () => { clearTimeout(rt); rt = setTimeout(() => { size(); MSz = mask(); draw(); }, 150); });
      cv.addEventListener("webglcontextlost", (e) => { e.preventDefault(); cancelAnimationFrame(raf); raf = 0; show(); });
      if (REDUCE) { addEventListener("scroll", () => requestAnimationFrame(draw), { passive: true }); return; }
      document.addEventListener("visibilitychange", kick);
    },
  };
})();

/* ---------- header string: bends with scroll velocity (spring k=180, c=12) and under the cursor ---------- */
(() => {
  const svg = $("string"), path = $("strPath");
  let w = 0, cx = 0, y = 0, v = 0, held = false, tyHeld = 0, lt = 0;
  const MID = 20;
  const put = () => path.setAttribute("d", `M0,${MID} Q${cx.toFixed(1)},${(MID + y * 2).toFixed(2)} ${w},${MID}`);
  const measure = () => { const r = svg.getBoundingClientRect(); w = r.width; svg.setAttribute("viewBox", `0 0 ${w} 40`); cx = w / 2; put(); return r; };
  let rect = measure(); addEventListener("resize", () => { rect = measure(); });
  if (REDUCE) return;
  const step = (t) => {
    const dt = Math.min(.033, lt ? (t - lt) / 1000 : .016); lt = t;
    const target = held ? tyHeld : Math.sign(vel) * Math.min(Math.abs(vel) * .02, 10);
    const a = -180 * (y - target) - 12 * v; v += a * dt; y += v * dt;
    if (!held) cx += (w / 2 - cx) * (1 - Math.exp(-dt * 3));
    put(); requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
  if (FINE) addEventListener("pointermove", (e) => {
    const x = e.clientX - rect.left, dy = e.clientY - (rect.top + MID);
    held = x > 0 && x < w && Math.abs(dy) < 18;
    if (held) { cx = x; tyHeld = clamp(-7, dy / 2, 7); }
  }, { passive: true });
})();

/* ---------- custom cursor ---------- */
if (FINE && !REDUCE) {
  root.classList.add("has-cur");
  const cur = $("cur"), lbl = $("curT"); let x = -100, y = -100; cur.classList.add("hide");
  const loop = () => { x += (P.x - x) * .35; y += (P.y - y) * .35; cur.style.transform = `translate3d(${x.toFixed(1)}px,${y.toFixed(1)}px,0)`; requestAnimationFrame(loop); };
  addEventListener("pointermove", (e) => { if (e.pointerType !== "mouse" && e.pointerType !== "pen") return; if (x < -50) { x = P.x; y = P.y; cur.classList.remove("hide"); } }, { passive: true });
  requestAnimationFrame(loop);
  document.addEventListener("pointerover", (e) => {
    const t = e.target.closest("[data-cl],a,button");
    const row = t && t.classList.contains("row-a");
    cur.classList.toggle("big", !!row); cur.classList.toggle("mid", !!t && !row);
    lbl.textContent = row ? "открыть" : "";
  });
  root.addEventListener("pointerleave", () => cur.classList.add("hide"));
  root.addEventListener("pointerenter", () => { if (x > -50) cur.classList.remove("hide"); });
}

/* ---------- repo previews ---------- */
const BAYER4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
function drawDither(cv) {
  const g = cv.getContext("2d"), W = cv.width, Hh = cv.height, cell = 3;
  g.fillStyle = "#0b0b0b"; g.fillRect(0, 0, W, Hh);
  // ink field in the same 4×4 ordered dither as the background
  const gw = Math.ceil(W / cell), gh = Math.ceil(Hh / cell), seed = [...(cv.dataset.dith || "x")].reduce((a, c) => a + c.charCodeAt(0), 0);
  const hs = (x, y) => { const s = Math.sin(x * 127.1 + y * 311.7 + seed) * 43758.5453; return s - Math.floor(s); };
  const vn = (x, y) => { const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, u = xf * xf * (3 - 2 * xf), w = yf * yf * (3 - 2 * yf);
    return (hs(xi, yi) * (1 - u) + hs(xi + 1, yi) * u) * (1 - w) + (hs(xi, yi + 1) * (1 - u) + hs(xi + 1, yi + 1) * u) * w; };
  for (let j = 0; j < gh; j++) for (let i = 0; i < gw; i++) {
    const x = i / gw * 4, y = j / gh * 2.5;
    let v = .5 * vn(x, y) + .25 * vn(x * 2.1, y * 2.1) + .125 * vn(x * 4.3, y * 4.3);
    v = Math.max(0, (v - .38) * 1.6) * (.35 + .65 * (i / gw));
    const b = BAYER4[(j & 3) * 4 + (i & 3)] + .5;
    if (v * 16 > b) { g.fillStyle = v * 16 > b + 7 ? "#8A8A8A" : "#3A3A3A"; g.fillRect(i * cell, j * cell, cell - 1, cell - 1); }
  }
  const F = '"JetBrains Mono", ui-monospace, monospace', pad = W * .06;
  g.fillStyle = "#EDEDED"; g.font = `500 ${Math.round(W * .17)}px ${F}`; g.textBaseline = "alphabetic";
  g.fillText(cv.dataset.dith, pad - W * .005, Hh * .58);
  g.fillStyle = "#8A8A8A"; g.font = `400 ${Math.round(W * .026)}px ${F}`;
  g.fillText((cv.dataset.l1 || "").toUpperCase(), pad, Hh * .2);
  g.fillText(cv.dataset.l2 || "", pad, Hh * .7);
  g.fillStyle = "#EDEDED"; g.font = `400 ${Math.round(W * .03)}px ${F}`;
  const words = (cv.dataset.l3 || "").split(" "); let line = "", ly = Hh * .83;
  for (const wd of words) { const tl = line ? line + " " + wd : wd; if (g.measureText(tl).width > W - pad * 2) { g.fillText(line, pad, ly); line = wd; ly += W * .042; } else line = tl; }
  if (line) g.fillText(line, pad, ly);
}
const rows = [...document.querySelectorAll(".row")];
const peek = $("peek"), peekI = $("peekI");
function previews() {
  rows.forEach((r) => {
    const m = r.querySelector(".media"), c = m.cloneNode(true);
    peekI.appendChild(c);
    [m, c].forEach((x) => x.querySelectorAll("canvas[data-dith]").forEach(drawDither));
  });
}
if (FINE) {
  const PW = 360, PH = 225; let x = P.x, y = P.y, tx = 0, ty = 0, rot = 0, on = false, raf = 0;
  const loop = () => {
    tx = clamp(8, P.x + 28, innerWidth - PW - 8); ty = clamp(8, P.y - PH / 2, innerHeight - PH - 8);
    if (P.x + 28 + PW > innerWidth - 8) tx = clamp(8, P.x - PW - 28, innerWidth - PW - 8);
    const ox = x; x += (tx - x) * .12; y += (ty - y) * .12;
    const tr = REDUCE ? 0 : clamp(-4, (x - ox) * .35, 4); rot += (tr - rot) * .2;
    peek.style.transform = `translate3d(${x.toFixed(1)}px,${y.toFixed(1)}px,0) rotate(${rot.toFixed(2)}deg)`;
    raf = on || Math.abs(tx - x) + Math.abs(rot) > .3 ? requestAnimationFrame(loop) : 0;
  };
  rows.forEach((r, i) => {
    const a = r.querySelector(".row-a");
    a.addEventListener("pointerenter", () => {
      if (!on) { x = clamp(8, P.x + 28, innerWidth - PW - 8); y = clamp(8, P.y - PH / 2, innerHeight - PH - 8); }
      [...peekI.children].forEach((c, k) => c.classList.toggle("on", k === i));
      on = true; peek.classList.add("on"); if (!raf) raf = requestAnimationFrame(loop);
    });
    a.addEventListener("pointerleave", () => { on = false; peek.classList.remove("on"); });
  });
} else {
  // touch: first tap opens the inline preview, second tap follows the link
  rows.forEach((r) => r.querySelector(".row-a").addEventListener("click", (e) => {
    if (r.classList.contains("open")) return;
    e.preventDefault(); rows.forEach((o) => o.classList.toggle("open", o === r));
  }));
}

/* ---------- sections: reveal, counter, nav, space ---------- */
const secs = [...document.querySelectorAll(".sec")], navs = [...document.querySelectorAll(".nav a")];
const KEY = { hero: "пробел — проекты", work: "пробел — связь", ping: "пробел — наверх" };
let curSec = "";
secs.forEach((s) => s.querySelectorAll(".ln").forEach((l, i) => l.style.setProperty("--i", Math.min(i, 12))));
const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } }), { threshold: .12 });
secs.forEach((s) => io.observe(s));
function pickSection() {
  const mid = innerHeight * .5; let best = secs[0];
  for (const s of secs) if (s.getBoundingClientRect().top <= mid) best = s;
  if (innerHeight + scrollY >= root.scrollHeight - 4) best = secs[secs.length - 1];
  if (best.id === curSec) return;
  curSec = best.id; const i = secs.indexOf(best);
  $("cnt").style.transform = `translateY(${-i}em)`;
  navs.forEach((a) => a.classList.toggle("on", a.dataset.sec === curSec));
  $("keyTxt").textContent = KEY[curSec];
}
let sq = 0; addEventListener("scroll", () => { if (!sq) sq = requestAnimationFrame(() => { sq = 0; pickSection(); }); }, { passive: true });
const topOf = (s) => s === secs[0] ? 0 : Math.round(s.getBoundingClientRect().top + scrollY);
addEventListener("keydown", (e) => {
  if (e.code !== "Space" || e.target.closest("a,button,input,textarea,select,[contenteditable]")) return;
  e.preventDefault(); const i = secs.findIndex((s) => s.id === curSec); goTo(topOf(secs[(i + 1) % secs.length]));
});
navs.forEach((a) => a.addEventListener("click", (e) => { e.preventDefault(); goTo(topOf($(a.dataset.sec))); }));
document.querySelector(".who").addEventListener("click", (e) => { e.preventDefault(); goTo(topOf($("ping"))); });

/* ---------- copy ---------- */
document.querySelectorAll("[data-copy]").forEach((b) => {
  const l = b.querySelector(".cp-l"), orig = l.textContent; let tm;
  b.addEventListener("click", async () => {
    const ok = await copyText(b.dataset.copy);
    l.textContent = ok ? "скопировано" : "не вышло"; b.classList.add("done");
    if (!REDUCE) l.animate([{ opacity: 0, transform: "translateY(40%)" }, { opacity: 1, transform: "none" }], { duration: 240, easing: "cubic-bezier(.16,1,.3,1)" });
    clearTimeout(tm); tm = setTimeout(() => { l.textContent = orig; b.classList.remove("done"); }, 1200);
  });
});

/* ---------- live Discord ---------- */
const stage = $("stage"), also = $("also");
const KIND = { music: "слушает", game: "играет", ide: "пишет код", other: "сейчас" };
function ditherCover(im, box) {
  try {
    const n = 96, c = document.createElement("canvas"); c.width = c.height = n;
    const g = c.getContext("2d", { willReadFrequently: true });
    const s = Math.min(im.naturalWidth, im.naturalHeight); g.drawImage(im, (im.naturalWidth - s) / 2, (im.naturalHeight - s) / 2, s, s, 0, 0, n, n);
    const d = g.getImageData(0, 0, n, n), p = d.data;
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      const i = (y * n + x) * 4; let l = (.2126 * p[i] + .7152 * p[i + 1] + .0722 * p[i + 2]) / 255;
      l = Math.pow(l, .8) * 1.08;
      const on = l * 16 > BAYER4[(y & 3) * 4 + (x & 3)] + .5, v = on ? 237 : 8;
      p[i] = p[i + 1] = p[i + 2] = v; p[i + 3] = 255;
    }
    g.putImageData(d, 0, 0); c.className = "dith-cov"; c.setAttribute("role", "img"); c.setAttribute("aria-label", im.alt);
    box.replaceChildren(c);
  } catch { im.style.filter = "grayscale(1) contrast(1.15)"; }
}
function cover(srcs, alt) {
  const c = h("div", "cov");
  if (srcs && srcs.length) {
    firstImage(srcs).then((u) => {
      if (!u) return;
      const im = h("img"); im.alt = alt; im.decoding = "async"; im.width = im.height = 96;
      const cors = u.includes("workers.dev"); if (cors) im.crossOrigin = "anonymous";
      im.style.filter = "grayscale(1)";
      im.onload = () => (cors ? ditherCover(im, c) : null);
      im.src = u; c.appendChild(im);
    });
  }
  return c;
}
function idleCover() {
  const c = h("div", "cov idle"); let s = "";
  for (let r = 0; r < 6; r++) { for (let k = 0; k < 8; k++) s += Math.random() < .55 ? " " : "·"; s += r < 5 ? "\n" : ""; }
  c.textContent = s; c.setAttribute("aria-hidden", "true"); return c;
}
function progress(a) {
  const p = h("p", "prog"); p.dataset.ps = a.start; p.dataset.pe = a.end; p.setAttribute("aria-hidden", "true");
  const bar = h("span", "bar"); bar.appendChild(h("i"));
  p.append(h("span", "pc", "0:00"), bar, h("span", "", fmt(a.end - a.start)));
  return p;
}
function tickProg() {
  const now = Date.now();
  document.querySelectorAll(".prog").forEach((p) => {
    const s = +p.dataset.ps, e = +p.dataset.pe, f = clamp(0, (now - s) / (e - s), 1);
    p.querySelector(".pc").textContent = fmt(Math.min(now, e) - s);
    p.querySelector(".bar i").style.setProperty("--p", f.toFixed(4));
  });
}
setInterval(() => { if (!document.hidden) tickProg(); }, 1000);

function view(m) {
  const el = h("div", "np"), meta = h("div", "meta"), acts = m.activities || [];
  const main = acts.find((a) => a.kind === "music") || acts.find((a) => a.kind === "game" || a.kind === "ide") || acts[0];
  const on = m.live && m.status !== "offline";
  let key;
  if (on && main) {
    key = main.key + main.title + main.start;
    el.appendChild(main.art.length ? cover(main.art, main.kind === "music" ? `Обложка: ${main.title}` : main.app) : idleCover());
    meta.append(h("p", "k", KIND[main.kind]), h("p", "t", main.title), h("p", "a", main.sub));
    if (main.kind === "music" && main.end > main.start) meta.appendChild(progress(main));
    else if (main.start) { const e = h("p", "el"); const s = h("span"); s.dataset.start = main.start; e.append(main.kind === "game" ? "в игре " : "уже ", s); meta.appendChild(e); }
  } else if (on) {
    key = "on-idle"; el.appendChild(idleCover());
    meta.append(h("p", "k", STATUS_RU[m.status] || "в сети"), h("p", "t", m.custom || "Ничего не запущено"), h("p", "a", "Discord открыт, музыка на паузе"));
  } else {
    const ls = lastSeen(m);
    if (ls && ls.act) {
      key = "past" + ls.at + ls.act.title; el.classList.add("past");
      el.appendChild(ls.act.art && ls.act.art.length ? cover(ls.act.art, `Обложка: ${ls.act.title}`) : idleCover());
      const k = h("p", "k", (ls.act.kind === "music" ? "последний трек" : "последнее") + " · "), a = h("span"); a.dataset.ago = ls.at; a.textContent = ago(ls.at); k.appendChild(a);
      meta.append(k, h("p", "t", ls.act.title), h("p", "a", ls.act.sub || ""));
    } else {
      key = "idle" + (m.live ? "" : "-load"); el.appendChild(idleCover());
      meta.append(h("p", "k", m.live ? "не в сети" : "подключаюсь"), h("p", "t", m.live ? "Ничего не играет" : "Секунду"),
        h("p", "note", m.live ? "Когда я что-то слушаю или запускаю, здесь будет обложка, трек и время." : "Статус идёт через свой прокси, обычно меньше секунды."));
    }
  }
  el.appendChild(meta);
  return { el, key, mainKey: on && main ? main.key : "" };
}
let curKey = "";
function render(m) {
  const on = m.live && m.status !== "offline", st = m.live ? STATUS_RU[m.status] || "в сети" : "";
  $("dot").dataset.s = m.live ? m.status : "unknown";
  $("stTxt").textContent = m.live ? `discord · ${st}` : "discord";
  $("nowLbl").textContent = "discord";
  $("nowAgo").textContent = m.live ? st : "";
  const v = view(m);
  if (v.key !== curKey) {
    curKey = v.key; const old = [...stage.children];
    v.el.style.opacity = "0"; stage.appendChild(v.el);
    requestAnimationFrame(() => requestAnimationFrame(() => { v.el.style.opacity = "1"; old.forEach((o) => { o.style.opacity = "0"; o.setAttribute("aria-hidden", "true"); }); }));
    setTimeout(() => old.forEach((o) => o.remove()), 340);
    tickProg(); tickTimes(stage);
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

document.querySelectorAll("[data-pushed]").forEach((t) => { const d = (Date.now() - Date.parse(t.dateTime)) / 864e5; if (d >= 0 && d < 60) t.textContent = d < 1 ? "обновлён сегодня" : d < 2 ? "обновлён вчера" : `обновлён ${Math.floor(d)} дн. назад`; t.title = t.dateTime.slice(0, 10); });
startTicker(document);
smooth();
field.start();
document.fonts.ready.then(previews, previews);
render({ live: false, status: "unknown", avatar: [], activities: [] });
watch(render);
pickSection();
