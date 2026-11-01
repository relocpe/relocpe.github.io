import { lastSeen, copyText } from "./core.js";
import { $, RM, COARSE, clamp, lerp, ease, S, bgVideo, sound, smooth, pinned, through, spaceNav, cursor, copies, reveal, chars, pushedDates, presenceCard, grain } from "./core.js";

const v = bgVideo($("v"));
const snd = sound(v, $("snd"), { label: $("sndL") });
grain(document.querySelector(".grain"), { size: 180 });

// Tor-style bootstrap log, ~1.7 s, any key or click skips
const nick = $("nickT"); chars(nick); nick.removeAttribute("aria-label");
const typeNick = () => { const cs = [...nick.children]; if (RM) { cs.forEach((c) => c.classList.add("on")); return; } cs.forEach((c, i) => setTimeout(() => c.classList.add("on"), 60 + i * 55)); };
function boot() {
  const box = $("boot"), log = $("bootLog");
  if (RM || new URLSearchParams(location.search).has("noboot")) { box.classList.add("done"); typeNick(); return; }
  const t = new Date(), mo = t.toLocaleString("en", { month: "short" }), d = String(t.getDate()).padStart(2, "0");
  const ts = () => { const n = new Date(); return `${mo} ${d} ${n.toTimeString().slice(0, 8)}.${String(n.getMilliseconds()).padStart(3, "0")}`; };
  const L = [
    ["0", "starting", "Starting"], ["5", "conn", "Connecting to a relay"], ["10", "conn_done", "Connected to a relay"],
    ["14", "handshake", "Handshaking with a relay"], ["15", "handshake_done", "Handshake with a relay done"],
    ["75", "enough_dirinfo", "Loaded enough directory info to build circuits"], ["90", "ap_handshake_done", "Handshake finished with a relay to build circuits"],
    ["95", "circuit_create", "Establishing a Tor circuit"], ["100", "done", "Done"],
  ];
  let i = 0, end = false, tm;
  const fin = () => { if (end) return; end = true; clearTimeout(tm); box.classList.add("done"); setTimeout(typeNick, 380); setTimeout(whoIntro, 420); removeEventListener("keydown", fin); removeEventListener("pointerdown", fin); };
  const step = () => {
    if (i >= L.length) { tm = setTimeout(fin, 320); return; }
    const [p, k, s] = L[i++], line = document.createElement("div");
    line.innerHTML = `${ts()} [notice] <b>Bootstrapped ${p}%</b> (${k}): ${s}${p === "100" ? ' <span class="ok">ok</span>' : ""}`;
    log.appendChild(line); tm = setTimeout(step, i < 3 ? 140 : 90 + Math.random() * 140);
  };
  addEventListener("keydown", fin); addEventListener("pointerdown", fin);
  step();
}
boot();

// scroll-driven video: camera push in the hero, closes to a slit, reopens as a box beside the contacts
const hero = $("top"), ping = $("ping"), nickEl = $("nick"), shot = $("shot"), shotI = shot && shot.querySelector(".shot-i");
let last = "";
const names = [...document.querySelectorAll(".repo-name")];
function frame() {
  const hp = pinned(hero), mob = innerWidth <= 820;
  const r = ping.getBoundingClientRect(), q = clamp(1 - r.top / innerHeight);
  let clip, sc, br;
  if (q <= 0) {
    const c = ease.io(clamp((hp - 0.2) / 0.7)) * 50;
    sc = 1 + 0.32 * ease.out(hp); clip = `inset(${c}% 0% ${c}% 0%)`; br = 0.5 - 0.15 * hp;
  } else {
    const k = ease.out(q), tgt = mob ? [6, 0, 66, 0] : [16, 6, 16, 52], from = mob ? [39, 0, 39, 0] : [50, 6, 50, 52];
    clip = `inset(${tgt.map((t, i) => lerp(from[i], t, k).toFixed(2) + "%").join(" ")})`; sc = 1.25 - 0.1 * k; br = 0.42;
  }
  if (RM) { sc = 1; }
  const s = `${clip}|${sc.toFixed(4)}|${br.toFixed(3)}`;
  if (s !== last) { last = s; v.style.clipPath = clip; v.style.webkitClipPath = clip; v.style.transform = `scale(${sc})`; v.style.filter = `grayscale(1) contrast(1.22) brightness(${br})`; }
  if (!RM) {
    const k = ease.out(clamp(hp / 0.6));
    nickEl.style.transform = `translate3d(0,${-k * 22}vh,0)`; nickEl.style.letterSpacing = `${-0.045 + k * 0.14}em`; nickEl.style.opacity = String(1 - clamp((hp - 0.35) / 0.4));
    if (shotI) { const t = through(shot); shot.style.setProperty("--c", (100 - ease.out(clamp(t * 2.4)) * 100).toFixed(2) + "%"); shot.style.setProperty("--z", ease.out(clamp(t * 1.6)).toFixed(3)); shot.style.setProperty("--py", ((0.5 - t) * 60).toFixed(1)); }
    names.forEach((n) => { const t = through(n); n.style.transform = `translate3d(${((0.5 - t) * 10).toFixed(2)}vw,0,0) skewX(${clamp(-S.v * 0.25, -8, 8).toFixed(2)}deg)`; });
  } else if (shotI) shot.style.setProperty("--c", "0%");
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

document.querySelectorAll(".tw").forEach((a) => chars(a));
document.querySelectorAll(".tw").forEach((a) => a.removeAttribute("aria-label"));
reveal();
pushedDates();
copies();
cursor($("cur"), $("curT"), { k: COARSE ? 1 : 0.32 });
smooth(0.09);
spaceNav([hero, $("work"), ping]);

// ---- discord block, top left: avatar + nick + status word, revealed like a process in the boot log
const who = $("who"), whoI = $("whoI"), whoC = $("whoC"), whoS = $("whoS"), whoN = $("whoN"), whoA = $("whoA"), whoAt = $("whoAt");
const WK = "relocpe:who", WORD = { online: "online", idle: "idle", dnd: "не беспокоить", offline: "offline" };
const shortAgo = (t) => { const m = Math.max(0, (Date.now() - t) / 6e4); return m < 2 ? "только что" : m < 60 ? `${Math.round(m)}м назад` : m < 1440 ? `${Math.round(m / 60)}ч назад` : `${Math.round(m / 1440)}д назад`; };
let wState = null, wIntro = !RM && !new URLSearchParams(location.search).has("noboot"), wPhase = wIntro ? 0 : 9, avReady = false;
try { if (sessionStorage.getItem("relocpe.who")) { wIntro = false; wPhase = 9; } } catch {}
if (!wIntro) who.classList.add("go");
function dither(img) {
  try {
    const d = Math.min(3, Math.ceil(devicePixelRatio || 1)), n = 36 * d; whoC.width = whoC.height = n;
    const g = whoC.getContext("2d", { willReadFrequently: true }); g.imageSmoothingQuality = "high"; g.drawImage(img, 0, 0, n, n);
    const px = g.getImageData(0, 0, n, n), a = px.data, B = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5], L = 6;
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      const i = (y * n + x) * 4; let v = (0.2126 * a[i] + 0.7152 * a[i + 1] + 0.0722 * a[i + 2]) / 255;
      v = Math.min(1, Math.max(0, (v - 0.5) * 1.15 + 0.5)); const t = (B[(((y / d) | 0) & 3) * 4 + (((x / d) | 0) & 3)] + 0.5) / 16;
      const q = Math.min(L - 1, Math.floor(v * (L - 1) + t)) / (L - 1) * 255; a[i] = a[i + 1] = a[i + 2] = q;
    }
    g.putImageData(px, 0, 0); who.classList.add("dith");
  } catch { who.classList.remove("dith"); }
}
function setAv(url) {
  if (!url || whoI.dataset.u === url) return; whoI.dataset.u = url;
  if (url.includes("workers.dev")) whoI.crossOrigin = "anonymous"; else whoI.removeAttribute("crossorigin");
  whoI.onload = () => { avReady = true; who.classList.add("ready"); dither(whoI); wNext(); };
  whoI.onerror = () => { const alt = wState && wState.avs && wState.avs.find((u) => u !== url); if (alt) setAv(alt); else { avReady = true; who.classList.add("noav"); wNext(); } };
  whoI.src = url;
}
function statusHTML() {
  const s = wState; if (!s) return 'fetch discord…<span class="cur1"></span>';
  let t = WORD[s.status] || "offline";
  if (s.status === "offline" && s.seen) t += ` · ${shortAgo(s.seen)}`;
  return t + (s.cached ? '<span class="cch">cached</span>' : "");
}
function wPaint() {
  const s = wState;
  who.dataset.s = !s ? "loading" : s.status in WORD ? s.status : "offline";
  if (wPhase >= 9) whoS.innerHTML = statusHTML();
  const a = s && s.act; whoA.classList.toggle("has", !!a); whoAt.textContent = a || "";
}
// intro: 1 fetch line 120 ms, 2 avatar scan reveal 360 ms, 3 nick typed 28 ms/char, 4 status with [ ok ]
function wNext() {
  if (wPhase === 1 && avReady) { wPhase = 2; who.classList.add("rev"); requestAnimationFrame(() => requestAnimationFrame(() => who.classList.add("go"))); setTimeout(() => { wPhase = 3; wType(); }, 360); }
}
function wType() {
  const t = "relocpe"; whoN.textContent = ""; let i = 0;
  const k = () => { whoN.textContent = t.slice(0, ++i); if (i < t.length) setTimeout(k, 28); else { wPhase = 4; wDone(); } };
  k();
}
function wDone() {
  if (wPhase < 4) return;
  if (!wState) { setTimeout(wDone, 150); return; }
  wPhase = 9; whoS.innerHTML = statusHTML() + ' <span class="ok">[ ok ]</span>';
  setTimeout(() => { whoS.innerHTML = statusHTML(); }, 1400);
  try { sessionStorage.setItem("relocpe.who", "1"); } catch {}
}
function whoIntro() {
  if (!wIntro || wPhase) return;
  whoN.textContent = ""; whoS.innerHTML = '> fetch discord…<span class="cur1"></span>';
  setTimeout(() => { wPhase = 1; if (avReady) wNext(); else setTimeout(() => { if (wPhase === 1) { avReady = true; wNext(); } }, 2500); }, 120);
}
if (wIntro) { whoN.textContent = ""; whoS.textContent = ""; }
function onPresence(m) {
  const A = { music: "слушает", game: "играет", ide: "кодит", other: "запущено" };
  if (m.live) {
    const acts = m.activities || [], main = acts.find((x) => x.kind === "music") || acts.find((x) => x.kind === "game" || x.kind === "ide") || acts[0];
    const act = m.status !== "offline" && main ? (main.kind === "music" ? `${A.music} · ${main.title}${main.sub ? " — " + main.sub : ""}` : `${A[main.kind] || "запущено"} · ${main.app || main.title}`) : "";
    const ls = lastSeen(m), av = (m.avatar || [])[0] || "";
    wState = { status: m.status || "offline", act, seen: m.status === "offline" && ls ? ls.at : 0, av, avs: m.avatar || [] };
    try { localStorage.setItem(WK, JSON.stringify({ status: wState.status, act, av, at: Date.now() })); } catch {}
    setAv(av);
  } else if (m.name) {
    if (wState && !wState.cached && wState.status) return; // keep what we had
    let c = null; try { c = JSON.parse(localStorage.getItem(WK) || "null"); } catch {}
    if (c) { wState = { status: c.status, act: "", seen: c.status === "offline" ? c.at : 0, cached: true, av: c.av }; setAv(c.av); }
    else wState = { status: "offline", act: "", seen: 0 };
  }
  if (!avReady && wState && !wState.av) { avReady = true; who.classList.add("noav"); wNext(); }
  wPaint();
}
who.addEventListener("click", () => {
  copyText("relocpe"); const keep = whoS.innerHTML; whoS.textContent = "скопировано";
  clearTimeout(who._t); who._t = setTimeout(() => { whoS.innerHTML = wPhase >= 9 ? statusHTML() : keep; }, 1200);
});
setInterval(() => { if (wPhase >= 9 && wState && wState.seen) whoS.innerHTML = statusHTML(); }, 60000);

presenceCard($("card"), { onView: (p, m) => onPresence(m) });
if (!wIntro) wPaint();
