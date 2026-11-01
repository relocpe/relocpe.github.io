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
  const fin = () => { if (end) return; end = true; clearTimeout(tm); box.classList.add("done"); setTimeout(typeNick, 380); removeEventListener("keydown", fin); removeEventListener("pointerdown", fin); };
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
presenceCard($("card"));
