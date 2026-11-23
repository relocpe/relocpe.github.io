// Discord-style profile card, shown inline in the contacts column (no popout).
// Rebuilt only when the visible data changes; decoded images are cached so live updates never flash.
import { CFG } from "./presence.js?v=1102b";
import { h, coverImg, tickTimes, lastSeen, ago } from "./core.js?v=1102b";

const clean = (t) => String(t || "").replace(/[\p{Extended_Pictographic}\u{FE0F}\u{200D}\u{20E3}]/gu, "").replace(/\s{2,}/g, " ").trim();
const ST = { online: "в сети", idle: "отошёл", dnd: "не беспокоить", offline: "не в сети" };
const HEAD = { music: "слушает", game: "играет", ide: "пишет код", other: "запущено" };
const img = (u) => CFG.img + "?u=" + encodeURIComponent(u);
let model = null, raw = null, rawAt = 0, rawP = null, built = "", pend = [];
const card = document.getElementById("dp");

// ---- image cache: one decoded <img> per source list, reused across rebuilds (no re-pop)
const IMG = new Map();
function pic(list, alt, cls) {
  const k = cls + "|" + list.join("|");
  let e = IMG.get(k);
  if (!e) { e = { el: null, done: false }; e.p = coverImg(list, alt, cls).then((im) => { e.el = im; e.done = true; return im; }, () => { e.done = true; return null; }); IMG.set(k, e); }
  return e;
}
function put(box, list, alt, cls, onNone) {
  if (!list || !list.length) { onNone && onNone(); return; }
  const e = pic(list, alt, cls);
  if (e.done) { if (e.el) box.appendChild(e.el); else onNone && onNone(); return; }
  box.classList.add("ld"); pend.push(e.p);
  e.p.then((im) => { box.classList.remove("ld"); if (im) { im.classList.add("fi"); box.appendChild(im); } else onNone && onNone(); });
}
let decEl = null, decKey = "";
function decoration(asset) {
  if (!asset) return null;
  if (decKey !== asset) { decKey = asset; decEl = new Image(); decEl.alt = ""; decEl.className = "dp-dec"; decEl.decoding = "async"; decEl.src = img(`https://cdn.discordapp.com/avatar-decoration-presets/${asset}.png?size=160&passthrough=false`); decEl.onerror = () => { decEl.remove(); decEl = null; }; }
  return decEl;
}

function getRaw() {
  if (raw && Date.now() - rawAt < 60000) return Promise.resolve(raw);
  if (rawP) return rawP;
  rawP = (async () => {
    for (const u of [CFG.presence, CFG.lanyard + CFG.id]) {
      try { const r = await fetch(u, { cache: "no-store" }); if (!r.ok) continue; const j = await r.json(); const d = j.data || j; if (d && d.discord_user) { raw = d; rawAt = Date.now(); break; } } catch {}
    }
    rawP = null; return raw;
  })();
  return rawP;
}

function banner(el, u) {
  if (u && u.banner) { const im = new Image(); im.alt = ""; im.decoding = "async"; im.className = "dp-bn-i"; im.src = img(`https://cdn.discordapp.com/banners/${u.id}/${u.banner}.${u.banner.startsWith("a_") ? "gif" : "png"}?size=600`); im.onerror = () => im.remove(); el.appendChild(im); }
  else if (u && Number.isFinite(u.accent_color)) el.style.background = "#" + u.accent_color.toString(16).padStart(6, "0");
}

function actBlock(a, past) {
  const b = h("section", "dp-act" + (past ? " past" : "")), hd = h("p", "dp-h", past ? (a.kind === "music" ? "последний трек" : "последнее") : HEAD[a.kind] || "запущено");
  const rw = h("div", "dp-ar"), cv = h("div", "dp-cv"), tx = h("div", "dp-tx");
  const music = a.kind === "music";
  tx.append(h("p", "dp-t", clean(music ? a.title : a.app)));
  const sub = clean(a.sub || "");
  if (sub) tx.append(h("p", "dp-s", sub));
  if (!past && !music && a.start) { const e = h("p", "dp-s dp-el"), s = h("span"); s.dataset.start = a.start; e.append(s, " прошло"); tx.append(e); }
  rw.append(cv, tx); b.append(hd, rw);
  if (!past && music && a.end > a.start) {
    const tr = h("div", "dp-pr"); tr.dataset.track = "";
    const bar = h("i", "dp-bar"), f = h("b"); f.dataset.bar = ""; bar.append(f);
    const tm = h("p", "dp-tm"), c = h("span"), t = h("span"); c.dataset.cur = ""; t.dataset.tot = ""; tm.dataset.start = a.start; tm.dataset.end = a.end; tm.append(c, t);
    tr.append(bar, tm); b.append(tr);
  }
  put(cv, a.art, music ? `Обложка: ${a.title}` : a.app, "dp-cvi", () => cv.classList.add("none"));
  return b;
}

function skeleton() {
  const bd = h("div", "dp-bd");
  bd.append(h("p", "dp-n sk sk-n"), h("p", "dp-u sk sk-u"));
  const s = h("section", "dp-act"); s.append(h("p", "dp-h sk sk-h")); const rw = h("div", "dp-ar"); const tx = h("div", "dp-tx"); tx.append(h("p", "sk sk-t"), h("p", "sk sk-s")); rw.append(h("div", "dp-cv sk"), tx); s.append(rw); bd.append(s, h("div", "dp-msg sk-m"));
  const av = h("div", "dp-av"); av.append(h("div", "dp-avi sk"));
  card.classList.add("skel"); card.replaceChildren(h("div", "dp-bn"), av, bd);
}

function build() {
  const m = model, u = raw && raw.discord_user;
  if (!m) { if (built !== "skel") { built = "skel"; skeleton(); } return; }
  const on = m.live && m.status !== "offline", st = m.live ? m.status : "offline";
  const acts = on ? m.activities || [] : [];
  const ls = on ? null : lastSeen(m);
  const key = JSON.stringify([m.live, st, m.custom, acts.map((a) => [a.title, a.app, a.sub, a.start, a.end, (a.art || [])[0]]), ls && [ls.at, ls.act && ls.act.title], !!u, u && u.banner, u && u.accent_color, u && u.avatar_decoration_data && u.avatar_decoration_data.asset, (m.avatar || [])[0]]);
  if (key === built) return; built = key;
  pend = [];
  card.classList.remove("skel");
  const bn = h("div", "dp-bn"); banner(bn, u);
  const av = h("div", "dp-av"), ai = h("div", "dp-avi"); av.append(ai);
  put(ai, m.avatar, "", "dp-avim", () => { ai.textContent = "r"; });
  const dec = decoration(u && u.avatar_decoration_data && u.avatar_decoration_data.asset);
  if (dec) av.append(dec);
  const pip = h("span", "dp-pip"); pip.dataset.s = st; pip.title = m.live ? ST[st] || st : "нет данных"; pip.append(h("i")); av.append(pip);
  const nodes = [bn, av];
  const cs = clean(m.custom);
  if (cs && on) { const b = h("p", "dp-bub"); b.append(h("span", "", cs)); nodes.push(b); }
  const bd = h("div", "dp-bd");
  bd.append(h("p", "dp-n", clean(u && (u.global_name || u.display_name)) || m.name || "relocpe"));
  const un = h("p", "dp-u"); un.append(h("span", "", (u && u.username) || "relocpe"), h("span", "dp-st", "· " + (m.live ? ST[st] || "в сети" : "Discord не ответил"))); bd.append(un);
  const music = acts.find((a) => a.kind === "music"), rest = acts.filter((a) => a !== music);
  const list = [music, ...rest].filter(Boolean).slice(0, 2);
  if (list.length) list.forEach((a) => bd.append(actBlock(a)));
  else if (on) { const s = h("section", "dp-act dp-q"); s.append(h("p", "dp-h", "сейчас"), h("p", "dp-s", "ничего не запущено")); bd.append(s); }
  else if (ls) { const s = h("section", "dp-act dp-q"), p = h("p", "dp-s"); p.dataset.was = ls.at; p.textContent = ago(ls.at); s.append(h("p", "dp-h", "был в сети"), p); bd.append(s); if (ls.act && ls.act.title) bd.append(actBlock(ls.act, true)); }
  const msg = h("a", "dp-msg"); msg.href = "https://discord.com/users/" + CFG.id; msg.target = "_blank"; msg.rel = "noopener"; msg.append(h("span", "", "написать @relocpe"), h("span", "dp-ar2", "↗"));
  bd.append(msg);
  card.replaceChildren(...nodes, bd);
  tickTimes(card);
}

setInterval(() => { if (!document.hidden) { tickTimes(card); card.querySelectorAll("[data-was]").forEach((e) => { e.textContent = ago(+e.dataset.was); }); } }, 1000);

let primed = false;
export function popUpdate(m) {
  model = m;
  if (!primed && (m.live || m.name)) { primed = true; getRaw().then(build); }
  build();
}
build();
