import { $, RM, COARSE, clamp, lerp, ease, S, bgVideo, sound, smooth, pinned, through, spaceNav, cursor, copies, chars, pushedDates, presenceCard, reveal, dominant } from "./core.js";

const v = bgVideo($("v"));
const root = document.documentElement, vw = $("vw"), hero = $("top"), nick = $("nick"), nickT = $("nickT");
const eq = [...document.querySelectorAll(".eq i")], now = $("now"), nowK = $("nowK"), nowT = $("nowT");
const snd = sound(v, $("snd"), { label: $("sndL"), analyse: true });
chars(nickT); nickT.removeAttribute("aria-label");
document.fonts.ready.then(() => requestAnimationFrame(() => nick.classList.add("in")));
setTimeout(() => nick.classList.add("in"), 900);

// accent follows the cover that is playing right now
const setAcc = (rgb) => { if (!rgb) return; const [r, g, b] = rgb, mx = Math.max(r, g, b) || 1, k = Math.max(1, 200 / mx); root.style.setProperty("--acc", `rgb(${[r, g, b].map((x) => Math.min(255, Math.round(x * k + 30))).join(",")})`); };
presenceCard($("card"), {
  onView(p, m, c, im) {
    if (im) { if (im.src.includes("workers.dev")) dominant(im.src).then(setAcc); return; }
    const a = p.mode === "now" ? p.main : p.mode === "past" ? p.past.act : null;
    if (a && a.kind === "music") { nowK.textContent = p.mode === "now" ? "сейчас играет" : "последний трек"; nowT.textContent = `${a.title}${a.sub ? " — " + a.sub : ""}`; now.hidden = false; requestAnimationFrame(() => now.classList.add("in")); }
    else if (a) { nowK.textContent = p.mode === "now" ? "сейчас" : "последнее"; nowT.textContent = a.title || a.app; now.hidden = false; requestAnimationFrame(() => now.classList.add("in")); }
    else { now.classList.remove("in"); }
  },
});

// waveform ribbon along the bottom
const cv = $("wave"), cx = cv.getContext("2d"); let W = 0, H = 0, dpr = 1;
const size = () => { dpr = Math.min(2, devicePixelRatio || 1); W = cv.clientWidth; H = cv.clientHeight; cv.width = W * dpr; cv.height = H * dpr; };
size(); addEventListener("resize", size);
const N = 72, sm = new Float32Array(N);
function wave(t, L, fade) {
  cx.setTransform(dpr, 0, 0, dpr, 0, 0); cx.clearRect(0, 0, W, H); if (fade <= 0.01) return;
  const acc = getComputedStyle(root).getPropertyValue("--acc").trim() || "#bbf";
  for (let i = 0; i < N; i++) {
    let x;
    if (L.spectrum) { const j = Math.floor(2 + Math.pow(i / N, 1.6) * 150); x = L.spectrum[j] / 255; }
    else { const s = t / 1000; x = (0.25 + 0.75 * L.b) * (0.5 + 0.5 * Math.sin(i * 0.33 + s * 2.1)) * (0.55 + 0.45 * Math.sin(i * 0.11 - s * 1.3)) * (1 - i / N * 0.5) + L.hi * 0.3 * Math.sin(i * 1.7 + s * 6) ** 2; }
    sm[i] = lerp(sm[i], x, 0.3);
  }
  const mid = H * 0.62, amp = H * 0.5;
  for (const [k, a, w] of [[1, 0.9, 1.4], [-0.45, 0.35, 1]]) {
    cx.beginPath();
    for (let i = 0; i <= N + 1; i++) {
      const idx = Math.min(N - 1, i), x = (i / (N + 1)) * W, y = mid - sm[idx] * amp * k * Math.sin((i / (N + 1)) * Math.PI);
      if (i === 0) cx.moveTo(x, y); else { const px = ((i - 0.5) / (N + 1)) * W; cx.quadraticCurveTo(px, y, x, y); }
    }
    cx.strokeStyle = acc; cx.globalAlpha = a * fade; cx.lineWidth = w; cx.shadowColor = acc; cx.shadowBlur = 12; cx.stroke();
  }
  cx.globalAlpha = 1;
}

// scroll: full frame → a spinning-record disc → a blurred ambient room
let last = "";
function frame(t) {
  const L = snd.level(t), mob = innerWidth <= 820;
  root.style.setProperty("--lv", L.b.toFixed(3));
  eq.forEach((e, i) => { e.style.height = (snd.on ? 3 + 9 * [L.b, L.m, L.hi * 2][i] : 3) + "px"; });
  const hp = pinned(hero), k = ease.io(clamp(hp / 0.55)), back = ease.io(clamp((hp - 0.6) / 0.4));
  const vmin = Math.min(innerWidth, innerHeight), full = Math.hypot(innerWidth, innerHeight) / 2;
  const disc = vmin * (mob ? 0.36 : 0.3) * (1 + L.b * 0.06);
  const r = lerp(lerp(full, disc, k), full, back);
  const blur = back * (mob ? 10 : 16), dim = 1 - back * 0.55;
  if (RM) { v.style.filter = hp > 0.6 ? "blur(12px) brightness(.45)" : ""; }
  else {
    const clip = `circle(${r.toFixed(1)}px at 50% 50%)`, tf = `scale(${(1 + k * 0.18 + back * 0.12 + L.b * 0.015).toFixed(4)}) rotate(${(k * (1 - back) * 8).toFixed(2)}deg)`;
    const fl = `blur(${blur.toFixed(1)}px) brightness(${dim.toFixed(3)}) saturate(${(1 + back * 0.3).toFixed(2)})`;
    const s = clip + tf + fl; if (s !== last) { last = s; vw.style.clipPath = clip; vw.style.webkitClipPath = clip; v.style.transform = tf; v.style.filter = fl; }
    nick.style.transform = `translate3d(0,${(-k * 8).toFixed(2)}vh,0) scale(${(1 + L.b * 0.025 - k * 0.12).toFixed(4)})`;
    nick.style.letterSpacing = `${(-0.045 + k * (mob ? 0.08 : 0.22)).toFixed(3)}em`;
    nick.style.opacity = String(clamp(1 - k * 0.6 - back * 1.2));
    now.style.opacity = now.classList.contains("in") ? String(clamp(1 - k * 2)) : "";
  }
  wave(t, L, RM ? 0 : 1);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// repo rows: the screenshot drifts with the pointer
if (!COARSE && !RM) document.querySelectorAll("[data-shot]").forEach((row) => {
  const f = row.querySelector(".row-shot");
  row.addEventListener("pointermove", (e) => { const r = row.getBoundingClientRect(); f.style.setProperty("--sx", `${((e.clientX - r.left) / r.width - 0.7) * 120}px`); f.style.setProperty("--sy", `${((e.clientY - r.top) / r.height - 0.5) * 60}px`); });
});

reveal("[data-rv]");
pushedDates();
copies();
cursor($("cur"), $("curT"), { k: 0.14 });
smooth(0.07);
spaceNav([hero, $("work"), $("ping")]);
