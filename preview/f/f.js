import { $, RM, COARSE, clamp, lerp, ease, S, bgVideo, sound, smooth, pinned, spaceNav, cursor, copies, chars, pushedDates, presenceCard } from "./core.js";

const v = bgVideo($("v"));
sound(v, $("snd"), { label: $("sndL") });
const vw = $("vw"), hero = $("top"), work = $("work"), ping = $("ping"), nick = $("nick"), nickT = $("nickT"), bigH = $("bigH");
const bh1 = bigH.querySelector(".bh1"), bh2 = bigH.querySelector(".bh2"), track = $("track"), marq = $("marq"), tg = $("tg");
const names = [...document.querySelectorAll(".p-name")];
chars(nickT); nickT.removeAttribute("aria-label");

// intro: the video through the letters, then a push through them
async function intro() {
  const box = $("intro"), svg = $("introSvg"), t = $("imT");
  if (RM || new URLSearchParams(location.search).has("nointro")) { box.classList.add("gone"); nick.classList.add("rise"); return; }
  await Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 700))]);
  const W = innerWidth, H = innerHeight; svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
  t.setAttribute("font-size", "100"); let len = 0; try { len = t.getComputedTextLength(); } catch {}
  t.setAttribute("font-size", String(len ? (100 * W * (W < 700 ? 0.9 : 0.82)) / len : W / 7));
  // origin: inside the stem of the "l" so the push lands on video
  let ox = W * 0.36, oy = H * 0.5;
  try { const bb = t.getExtentOfChar(3); ox = bb.x + bb.width * 0.5; oy = bb.y + bb.height * 0.55; } catch {}
  box.style.transformOrigin = `${ox}px ${oy}px`;
  await new Promise((r) => setTimeout(r, 650));
  const a = box.animate([{ transform: "scale(1)", opacity: 1 }, { transform: "scale(3)", opacity: 1, offset: 0.45 }, { transform: "scale(28)", opacity: 0 }], { duration: 1500, easing: "cubic-bezier(.7,0,.84,0)", fill: "forwards" });
  setTimeout(() => nick.classList.add("rise"), 1050);
  a.onfinish = () => box.classList.add("gone");
}
intro();

// scroll scene
const quad = (a, b, k) => "polygon(" + a.map((p, i) => `${lerp(p[0], b[i][0], k).toFixed(2)}% ${lerp(p[1], b[i][1], k).toFixed(2)}%`).join(",") + ")";
const FULL = [[0, 0], [100, 0], [100, 100], [0, 100]];
let mx = 0, lt = performance.now(), last = "";
function frame(now) {
  const dt = Math.min(64, now - lt); lt = now;
  const mob = innerWidth <= 820, H = innerHeight;
  const hr = hero.getBoundingClientRect(), pr = ping.getBoundingClientRect();
  let clip, tr = 0, sc = 1;
  if (pr.top < H) {
    const q = pinned(ping), k = ease.out(clamp(q / 0.75));
    const D = mob ? [[50, 34], [78, 50], [50, 66], [22, 50]] : [[50, 26], [64, 50], [50, 74], [36, 50]];
    clip = quad(D, FULL, k); tr = Math.max(0, pr.top); sc = 1.35 - 0.35 * k;
    bigH.style.opacity = "0";
    if (!RM) tg.style.transform = `translate3d(0,${(1 - k) * 8}vh,0) scale(${(0.6 + 0.4 * k).toFixed(4)})`;
  } else {
    const hp = pinned(hero), k = ease.io(clamp(hp / 0.8));
    const Q = mob ? [[6, 22], [94, 17], [96, 70], [4, 76]] : [[16, 15], [79, 9], [86, 84], [11, 91]];
    clip = quad(FULL, Q, k); sc = 1 + 0.28 * ease.out(hp); tr = Math.min(0, hr.bottom - H);
    if (!RM) {
      nick.style.transform = `translate3d(0,${-k * 46}vh,0) scale(${(1 + k * 0.35).toFixed(4)})`; nick.style.opacity = String(clamp(1 - k * 1.4));
      bigH.style.opacity = String(clamp(k * 1.6)); bh1.style.transform = `translate3d(${(-(1 - k) * 40).toFixed(2)}vw,0,0)`; bh2.style.transform = `translate3d(${((1 - k) * 40).toFixed(2)}vw,0,0)`;
    }
  }
  if (RM) { clip = "none"; tr = 0; sc = 1; }
  const s = clip + tr.toFixed(1) + sc.toFixed(4);
  if (s !== last) { last = s; vw.style.clipPath = clip; vw.style.webkitClipPath = clip; vw.style.transform = `translate3d(0,${tr}px,0)`; v.style.transform = `scale(${sc})`; }
  if (!RM) {
    // horizontal repo track
    if (!mob) { const wp = pinned(work), max = track.scrollWidth - innerWidth; track.style.transform = `translate3d(${(-wp * max).toFixed(1)}px,0,0)`; }
    const vel = clamp(S.v, -60, 60);
    names.forEach((n) => { n.style.transform = `skewX(${(-vel * 0.18).toFixed(2)}deg)`; });
    mx -= (0.04 + Math.abs(vel) * 0.012) * dt; const w = marq.scrollWidth / 2; if (mx < -w) mx += w; marq.style.transform = `translate3d(${mx.toFixed(1)}px,0,0)`;
  }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// tilt on the screenshot
if (!COARSE && !RM) document.querySelectorAll(".tilt").forEach((el) => {
  el.addEventListener("pointermove", (e) => { const r = el.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5; el.style.setProperty("--ry", `${(x * 14).toFixed(2)}deg`); el.style.setProperty("--rx", `${(-y * 14).toFixed(2)}deg`); });
  el.addEventListener("pointerleave", () => { el.style.setProperty("--ry", "0deg"); el.style.setProperty("--rx", "0deg"); });
});

pushedDates();
copies();
cursor($("cur"), $("curT"), { k: 0.2 });
smooth(0.08);
spaceNav([hero, work, ping, document.querySelector(".ping-b")]);
presenceCard($("card"));
