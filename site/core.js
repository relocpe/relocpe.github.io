// Shared runtime for previews e/f/g: video, sound, smooth scroll, cursor, Discord presence card.
import { watch, firstImage, lastSeen, startTicker, tickTimes, copyText, h, ago, STATUS_RU, dominant } from "./presence.js?v=1102a";
export { watch, firstImage, lastSeen, startTicker, tickTimes, copyText, h, ago, STATUS_RU, dominant };
export const $ = (id) => document.getElementById(id);
export const RM = matchMedia("(prefers-reduced-motion: reduce)").matches;
export const COARSE = matchMedia("(pointer: coarse)").matches;
export const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const ease = { out: (t) => 1 - Math.pow(1 - t, 4), io: (t) => (t < 0.5 ? 8 * t ** 4 : 1 - 8 * (1 - t) ** 4), expo: (t) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t)) };
document.documentElement.classList.add("js");

// ---- background video: user's own file from the site root, 720p on phones / save-data
export function bgVideo(v) {
  const q = new URLSearchParams(location.search);
  const small = q.get("hq") !== "1" && ((COARSE && Math.min(screen.width, screen.height) <= 820) || innerWidth <= 820 || (navigator.connection && navigator.connection.saveData));
  v.muted = true; v.defaultMuted = true; v.loop = true; v.playsInline = true; v.setAttribute("playsinline", ""); v.setAttribute("webkit-playsinline", "");
  v.poster = "poster5.jpg"; v.preload = "auto";
  v.src = small ? "bg5-720.mp4" : "bg5.mp4";
  const tryPlay = () => { const p = v.play(); if (p && p.catch) p.catch(() => {}); };
  if (!RM) tryPlay();
  v.addEventListener("playing", () => document.documentElement.classList.add("vid-on"));
  document.addEventListener("visibilitychange", () => { if (document.hidden) v.pause(); else if (!RM || !v.muted) tryPlay(); });
  v.dataset.small = small ? "1" : "0";
  return v;
}

// ---- sound: first real gesture or the toggle unmutes with a fade to 0.3; "off" remembered per session
export function sound(v, btn, { label, analyse = false, onChange } = {}) {
  const VOL = 0.3; let ctx = null, gain = null, an = null, raf = 0, armed = true, off = false;
  try { off = localStorage.getItem("relocpe.snd") === "off"; } catch {}
  const setVol = (x) => { if (gain) { gain.gain.value = x; v.volume = 1; } else v.volume = x; };
  const ui = () => { const on = !v.muted; btn.setAttribute("aria-pressed", on ? "true" : "false"); btn.classList.toggle("on", on); if (label) label.textContent = on ? "звук вкл" : "звук выкл"; onChange && onChange(on); };
  const graph = () => {
    if (!analyse || ctx) return;
    try {
      const AC = window.AudioContext || window.webkitAudioContext; ctx = new AC();
      const src = ctx.createMediaElementSource(v); an = ctx.createAnalyser(); an.fftSize = 512; an.smoothingTimeConstant = 0.78;
      gain = ctx.createGain(); src.connect(an); an.connect(gain); gain.connect(ctx.destination);
    } catch { ctx = null; gain = null; an = null; }
  };
  const fadeIn = () => { cancelAnimationFrame(raf); const t0 = performance.now(); setVol(0); const f = (t) => { const k = clamp((t - t0) / 1200); setVol(VOL * k * k * (3 - 2 * k)); if (k < 1) raf = requestAnimationFrame(f); }; raf = requestAnimationFrame(f); };
  const on = () => { graph(); if (ctx && ctx.state !== "running") ctx.resume().catch(() => {}); v.muted = false; setVol(0); const p = v.play(); if (p && p.then) p.then(fadeIn, () => { v.muted = true; ui(); }); else fadeIn(); ui(); };
  const mute = () => { cancelAnimationFrame(raf); v.muted = true; ui(); if (RM) v.pause(); };
  btn.addEventListener("click", (e) => { e.stopPropagation(); armed = false; if (v.muted || v.paused) { off = false; try { localStorage.removeItem("relocpe.snd"); } catch {} on(); } else { off = true; try { localStorage.setItem("relocpe.snd", "off"); } catch {} mute(); } });
  // first gesture unmutes: wheel/touch/scroll keys don't grant activation everywhere, so act only once the page has it
  const EV = ["wheel", "touchstart", "touchend", "pointerdown", "pointerup", "keydown", "scroll"], UA = navigator.userActivation;
  const disarm = () => { armed = false; EV.forEach((t) => removeEventListener(t, first, true)); };
  const first = (e) => {
    if (!armed || off) return; if (e.target && e.target.closest && e.target.closest("[data-nosnd]")) return;
    if (e.type === "keydown" && (e.metaKey || e.ctrlKey || e.altKey)) return;
    if (UA ? !UA.hasBeenActive : !/^(pointerup|keydown|touchend)$/.test(e.type)) return;
    if (!v.muted && !v.paused) { disarm(); return; }
    disarm(); on();
  };
  EV.forEach((t) => addEventListener(t, first, { capture: true, passive: true }));
  // try sound straight away; browsers without permission reject, then it stays muted and waits for a gesture
  if (!off && !RM) {
    v.muted = false; setVol(VOL);
    const p = v.play();
    const back = () => { v.muted = true; v.play().catch(() => {}); ui(); };
    if (p && p.then) p.then(() => { if (!v.muted) disarm(); ui(); }, back); else if (v.paused) back();
  }
  v.addEventListener("volumechange", ui); ui();
  // level(): {b,m,hi, live} 0..1 bands; live=false when there is no real signal (muted / no graph)
  const buf = new Uint8Array(256); let sb = 0, sm = 0, sh = 0;
  const level = (t) => {
    let b, m, hi, live = false;
    if (an && !v.muted && !v.paused) {
      an.getByteFrequencyData(buf); let x = 0, y = 0, z = 0;
      for (let i = 1; i < 8; i++) x += buf[i]; for (let i = 8; i < 48; i++) y += buf[i]; for (let i = 48; i < 160; i++) z += buf[i];
      b = x / 7 / 255; m = y / 40 / 255; hi = z / 112 / 255; live = b + m > 0.02;
    }
    if (!live) { const s = t / 1000, beat = Math.pow(0.5 + 0.5 * Math.sin(s * Math.PI * 2 * 1.15), 6); b = 0.18 + 0.32 * beat; m = 0.2 + 0.08 * Math.sin(s * 1.7); hi = 0.12 + 0.05 * Math.sin(s * 3.1); }
    sb = lerp(sb, b, 0.35); sm = lerp(sm, m, 0.2); sh = lerp(sh, hi, 0.2);
    return { b: sb, m: sm, hi: sh, live, spectrum: an && live ? buf : null };
  };
  return { level, get on() { return !v.muted; } };
}

// ---- smooth scroll (Lenis), falls back to native
export const S = { y: 0, v: 0, lenis: null };
export async function smooth(lerpK = 0.09) {
  const tick = () => { S.y = S.lenis ? S.lenis.scroll : scrollY; };
  if (RM) { addEventListener("scroll", tick, { passive: true }); return null; }
  try {
    const { default: Lenis } = await import("./lenis.mjs");
    const l = new Lenis({ lerp: lerpK, smoothWheel: true, syncTouch: false });
    S.lenis = l; l.on("scroll", (e) => { S.y = e.scroll; S.v = e.velocity; });
    const raf = (t) => { l.raf(t); requestAnimationFrame(raf); }; requestAnimationFrame(raf);
    document.querySelectorAll('a[href^="#"]').forEach((a) => a.addEventListener("click", (e) => { const t = document.querySelector(a.getAttribute("href")); if (t) { e.preventDefault(); l.scrollTo(t, { duration: 1.1, easing: ease.io }); } }));
    return l;
  } catch { addEventListener("scroll", tick, { passive: true }); return null; }
}
export function goTo(el, dur = 1.1) { if (S.lenis) S.lenis.scrollTo(el, { duration: dur, easing: ease.io, force: true }); else el.scrollIntoView({ behavior: RM ? "auto" : "smooth" }); }
// progress of an element through the viewport: 0 when its top hits the bottom, 1 when its bottom hits the top
export function through(el) { const r = el.getBoundingClientRect(); return clamp((innerHeight - r.top) / (innerHeight + r.height)); }
// 0 at top of element pinned, 1 when scrolled its height minus a viewport (for tall sticky tracks)
export function pinned(el) { const r = el.getBoundingClientRect(); return clamp(-r.top / Math.max(1, r.height - innerHeight)); }

// Space / Shift+Space jump between [data-stop] sections
export function spaceNav(list) {
  addEventListener("keydown", (e) => {
    if (e.code !== "Space" || e.target.closest("a,button,input,textarea,select,[contenteditable]")) return;
    e.preventDefault(); const y = S.lenis ? S.lenis.scroll : scrollY, tops = list.map((s) => s.getBoundingClientRect().top + y);
    let i = tops.findIndex((t) => t > y + 8); if (e.shiftKey) { i = tops.filter((t) => t < y - 8).length - 1; }
    if (i < 0) i = e.shiftKey ? 0 : list.length - 1; goTo(list[i], 0.9);
  });
}

// ---- custom cursor: element with .on/.big classes; label from [data-cl]
export function cursor(el, label, { k = 0.22 } = {}) {
  if (COARSE || !matchMedia("(hover: hover)").matches) { el.remove(); return null; }
  const P = { x: innerWidth / 2, y: innerHeight / 2, cx: innerWidth / 2, cy: innerHeight / 2, seen: false };
  addEventListener("pointermove", (e) => { if (e.pointerType !== "mouse") return; P.x = e.clientX; P.y = e.clientY; if (!P.seen) { P.seen = true; P.cx = P.x; P.cy = P.y; el.classList.add("on"); document.documentElement.classList.add("has-cur"); } }, { passive: true });
  document.addEventListener("pointerleave", () => el.classList.remove("on"));
  document.addEventListener("pointerenter", () => P.seen && el.classList.add("on"));
  document.addEventListener("pointerover", (e) => { const t = e.target.closest && e.target.closest("[data-cl]"); el.classList.toggle("big", !!t); if (t && label) label.textContent = t.dataset.cl; });
  addEventListener("pointerdown", () => el.classList.add("down")); addEventListener("pointerup", () => el.classList.remove("down"));
  const f = () => { P.cx = lerp(P.cx, P.x, RM ? 1 : k); P.cy = lerp(P.cy, P.y, RM ? 1 : k); el.style.transform = `translate3d(${P.cx}px,${P.cy}px,0)`; requestAnimationFrame(f); };
  requestAnimationFrame(f); return P;
}

// ---- copy buttons: label morphs for 1.2 s
export function copies(root = document) {
  root.querySelectorAll("[data-copy]").forEach((b) => { const l = b.querySelector(".cp-l") || b, o = l.textContent; let tm; b.addEventListener("click", async () => { const ok = await copyText(b.dataset.copy); l.textContent = ok ? "скопировано" : "не вышло"; b.classList.add("done"); clearTimeout(tm); tm = setTimeout(() => { l.textContent = o; b.classList.remove("done"); }, 1200); }); });
}

// ---- reveal once when in view
export function reveal(sel = "[data-rv]", root = document) {
  const els = [...root.querySelectorAll(sel)];
  if (RM || !("IntersectionObserver" in window)) { els.forEach((e) => e.classList.add("in")); return; }
  const io = new IntersectionObserver((es) => es.forEach((x) => { if (x.isIntersecting) { x.target.classList.add("in"); io.unobserve(x.target); } }), { rootMargin: "0px 0px -12% 0px" });
  els.forEach((e) => io.observe(e));
}
// split text into per-char spans (aria on parent)
export function chars(el) { const t = el.textContent; el.setAttribute("aria-label", t); el.textContent = ""; [...t].forEach((c, i) => { const s = h("span", "ch", c === " " ? "\u00a0" : c); s.style.setProperty("--i", i); s.setAttribute("aria-hidden", "true"); el.appendChild(s); }); return el; }

// ---- relative "updated" dates
export function pushedDates() { document.querySelectorAll("time[data-pushed]").forEach((t) => { const d = (Date.now() - Date.parse(t.dateTime)) / 864e5; if (d >= 0 && d < 60) t.textContent = d < 1 ? "сегодня" : d < 2 ? "вчера" : `${Math.floor(d)} дн. назад`; t.title = t.dateTime.slice(0, 10); }); }

// ---- presence model -> view data
export const KIND = { music: "слушаю", game: "играю", ide: "пишу код", other: "запущено" };
export function pick(m) {
  const acts = m.activities || [], on = m.live && m.status !== "offline";
  const main = acts.find((a) => a.kind === "music") || acts.find((a) => a.kind === "game" || a.kind === "ide") || acts[0];
  if (on && main) return { mode: "now", main, rest: acts.filter((a) => a !== main), on };
  if (on) return { mode: "idle", rest: [], on };
  const ls = lastSeen(m);
  if (ls && ls.act) return { mode: "past", past: ls, rest: [], on };
  return { mode: m.live ? "offline" : "loading", rest: [], on };
}
// cover <img> from a proxy list; resolves to the element or null
export async function coverImg(list, alt, cls = "cov") { const u = await firstImage(list || []); if (!u) return null; const i = new Image(); i.className = cls; i.alt = alt || ""; i.decoding = "async"; if (u.includes("workers.dev")) i.crossOrigin = "anonymous"; i.src = u; try { await i.decode(); } catch {} return i; }

// ---- Discord card. Same markup in every variant; each variant styles it its own way.
export function presenceCard(box, { onView } = {}) {
  let key = "";
  const render = async (m) => {
    const p = pick(m), st = m.live ? STATUS_RU[m.status] || "в сети" : "";
    document.querySelectorAll("[data-pst]").forEach((e) => { e.dataset.s = m.live ? m.status : "unknown"; });
    document.querySelectorAll("[data-psttxt]").forEach((e) => { e.textContent = m.live ? st : "discord"; });
    const k = p.mode + (p.main ? p.main.key + p.main.title + p.main.start + p.main.end : "") + (p.past ? p.past.at : "") + m.status + m.custom + p.rest.map((a) => a.key + a.title).join();
    if (k === key) return; key = k;
    const c = h("div", "pc"); c.dataset.mode = p.mode;
    const top = h("div", "pc-top"), dot = h("span", "pc-dot"); dot.dataset.s = m.live ? m.status : "unknown";
    top.append(dot, h("span", "pc-st", m.live ? st : "discord"), h("span", "pc-name", "relocpe"));
    const main = h("div", "pc-main"), art = h("div", "pc-art"), meta = h("div", "pc-meta");
    let artList = null, alt = "";
    if (p.mode === "now") {
      const a = p.main; artList = a.art; alt = a.kind === "music" ? `Обложка: ${a.title}` : a.app;
      meta.append(h("p", "pc-k", KIND[a.kind]), h("p", "pc-t", a.title), h("p", "pc-a", a.sub));
      if (a.kind === "music" && a.end > a.start) {
        const pr = h("div", "pc-prog"); pr.dataset.track = ""; const tm = h("div", "pc-tm"); tm.dataset.start = a.start; tm.dataset.end = a.end;
        const cu = h("span", "", "0:00"); cu.dataset.cur = ""; const to = h("span", "", ""); to.dataset.tot = ""; tm.append(cu, to);
        const bar = h("i", "pc-bar"), b = h("b"); b.dataset.bar = ""; bar.appendChild(b); pr.append(bar, tm); meta.appendChild(pr);
      } else if (a.start) { const e = h("p", "pc-el"), s = h("span"); s.dataset.start = a.start; e.append(a.kind === "game" ? "в игре " : "уже ", s); meta.appendChild(e); }
    } else if (p.mode === "idle") {
      meta.append(h("p", "pc-k", st), h("p", "pc-t", m.custom || "Ничего не запущено"), h("p", "pc-a", "Discord открыт, музыка на паузе"));
    } else if (p.mode === "past") {
      const a = p.past.act; artList = a.art; alt = `Обложка: ${a.title}`;
      const kk = h("p", "pc-k", (a.kind === "music" ? "последний трек" : "последнее") + " · "), ag = h("span", "", ago(p.past.at)); ag.dataset.ago = p.past.at; kk.appendChild(ag);
      meta.append(kk, h("p", "pc-t", a.title), h("p", "pc-a", a.sub || ""));
    } else if (p.mode === "offline") {
      meta.append(h("p", "pc-k", "не в сети"), h("p", "pc-t", "Сейчас тихо"), h("p", "pc-a", "Когда я что-то слушаю или запускаю, здесь появится обложка и время."));
    } else meta.append(h("p", "pc-k", "подключаюсь"), h("p", "pc-t", "Секунду"), h("p", "pc-a", "Статус идёт через свой прокси"));
    art.classList.add("empty"); main.append(art, meta); c.append(top, main);
    if (m.custom && p.mode === "now") c.appendChild(h("p", "pc-cs", m.custom));
    if (p.rest.length) { const ul = h("ul", "pc-rest"); p.rest.forEach((a) => { const li = h("li"), t = h("span", "pc-rt"); if (a.start) t.dataset.start = a.start; li.append(h("span", "pc-rk", KIND[a.kind]), h("span", "pc-rn", a.kind === "music" ? `${a.title}${a.sub ? " — " + a.sub : ""}` : a.app + (a.sub ? " · " + a.sub : "")), t); ul.appendChild(li); }); c.appendChild(ul); }
    const old = [...box.children]; c.classList.add("enter"); box.appendChild(c);
    requestAnimationFrame(() => requestAnimationFrame(() => { c.classList.remove("enter"); old.forEach((o) => { o.classList.add("leave"); o.setAttribute("aria-hidden", "true"); }); }));
    setTimeout(() => old.forEach((o) => o.remove()), 600);
    tickTimes(c);
    onView && onView(p, m, c);
    if (artList && artList.length) { const im = await coverImg(artList, alt); if (im && c.isConnected) { art.classList.remove("empty"); art.appendChild(im); requestAnimationFrame(() => im.classList.add("in")); onView && onView(p, m, c, im); } }
  };
  render({ live: false, status: "unknown", activities: [] });
  watch(render); startTicker(box);
}

// ---- film grain tile made once at runtime, animated in CSS by stepping background-position
export function grain(el, { size = 160, alpha = 1 } = {}) {
  try {
    const c = document.createElement("canvas"); c.width = c.height = size; const g = c.getContext("2d"), d = g.createImageData(size, size);
    for (let i = 0; i < d.data.length; i += 4) { const v = Math.random() * 255; d.data[i] = d.data[i + 1] = d.data[i + 2] = v; d.data[i + 3] = 255 * alpha; }
    g.putImageData(d, 0, 0); el.style.backgroundImage = `url(${c.toDataURL()})`;
  } catch {}
}
