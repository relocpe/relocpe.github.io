// Discord-style profile popout: hover (desktop) / tap sheet (touch) on the discord row + ticker
import { CFG } from "../shared/presence.js";
import { RM, h, coverImg, tickTimes, lastSeen, ago } from "./core.js";

const clean = (t) => String(t || "").replace(/[\p{Extended_Pictographic}\u{FE0F}\u{200D}\u{20E3}]/gu, "").replace(/\s{2,}/g, " ").trim();
const ST = { online: "в сети", idle: "отошёл", dnd: "не беспокоить", offline: "не в сети" };
const HEAD = { music: "слушает", game: "играет", ide: "пишет код", other: "запущено" };
const img = (u) => CFG.img + "?u=" + encodeURIComponent(u);
const sheetMQ = matchMedia("(max-width: 820px), (pointer: coarse)");

let model = null, raw = null, rawAt = 0, open = false, anchor = null, tIn = 0, tOut = 0, lastFocus = null, built = "";
const bk = h("div", "dp-bk"), card = h("div", "dp");
card.id = "dp"; card.setAttribute("role", "dialog"); card.setAttribute("aria-label", "Профиль Discord: relocpe"); card.hidden = true; bk.hidden = true;
document.body.append(bk, card);

async function getRaw() {
  if (raw && Date.now() - rawAt < 60000) return raw;
  for (const u of [CFG.presence, CFG.lanyard + CFG.id]) {
    try { const r = await fetch(u, { cache: "no-store" }); if (!r.ok) continue; const j = await r.json(); const d = j.data || j; if (d && d.discord_user) { raw = d; rawAt = Date.now(); return raw; } } catch {}
  }
  return raw;
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
  const sub = clean(music ? a.sub : a.sub || "");
  if (sub) tx.append(h("p", "dp-s", sub));
  if (!past && !music && a.start) { const e = h("p", "dp-s dp-el"), s = h("span"); s.dataset.start = a.start; e.append(s, " прошло"); tx.append(e); }
  rw.append(cv, tx); b.append(hd, rw);
  if (!past && music && a.end > a.start) {
    const tr = h("div", "dp-pr"); tr.dataset.track = "";
    const bar = h("i", "dp-bar"), f = h("b"); f.dataset.bar = ""; bar.append(f);
    const tm = h("p", "dp-tm"), c = h("span"), t = h("span"); c.dataset.cur = ""; t.dataset.tot = ""; tm.dataset.start = a.start; tm.dataset.end = a.end; tm.append(c, t);
    tr.append(bar, tm); b.append(tr);
  }
  if (a.art && a.art.length) coverImg(a.art, music ? `Обложка: ${a.title}` : a.app, "dp-cvi").then((im) => { if (im) cv.appendChild(im); else cv.classList.add("none"); });
  else cv.classList.add("none");
  return b;
}

function build() {
  const m = model || { live: false, status: "unknown", activities: [] }, u = raw && raw.discord_user;
  const on = m.live && m.status !== "offline", st = m.live ? m.status : "offline";
  const acts = on ? m.activities || [] : [];
  const key = JSON.stringify([m.live, st, m.custom, acts.map((a) => [a.title, a.app, a.sub, a.start, a.end]), !!u, u && u.banner, u && u.avatar_decoration_data && u.avatar_decoration_data.asset, (m.avatar || [])[0]]);
  if (key === built) return; built = key;
  const bn = h("div", "dp-bn"); banner(bn, u);
  const av = h("div", "dp-av"), ai = h("div", "dp-avi"); av.append(ai);
  ai.textContent = "r";
  if (m.avatar && m.avatar.length) coverImg(m.avatar, "", "dp-avim").then((im) => { if (im) { ai.textContent = ""; ai.appendChild(im); } });
  const dec = u && u.avatar_decoration_data && u.avatar_decoration_data.asset;
  if (dec) { const d = new Image(); d.alt = ""; d.className = "dp-dec"; d.decoding = "async"; d.src = img(`https://cdn.discordapp.com/avatar-decoration-presets/${dec}.png?size=160&passthrough=false`); d.onerror = () => d.remove(); av.append(d); }
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
  else { const ls = lastSeen(m); if (ls) { const s = h("section", "dp-act dp-q"), p = h("p", "dp-s"); p.dataset.was = ls.at; p.textContent = ago(ls.at); s.append(h("p", "dp-h", "был в сети"), p); bd.append(s); if (ls.act && ls.act.title) bd.append(actBlock(ls.act, true)); } }
  const msg = h("a", "dp-msg"); msg.href = "https://discord.com/users/" + CFG.id; msg.target = "_blank"; msg.rel = "noopener"; msg.append(h("span", "", "написать @relocpe"), h("span", "dp-ar2", "↗"));
  bd.append(msg);
  const x = h("button", "dp-x"); x.type = "button"; x.setAttribute("aria-label", "Закрыть"); x.textContent = "×"; x.addEventListener("click", () => hide(true));
  card.replaceChildren(...nodes, bd, x);
  tickTimes(card);
}

function place() {
  if (!open) return;
  if (card.classList.contains("sheet")) { card.style.left = card.style.top = ""; return; }
  const r = anchor.getBoundingClientRect(), W = innerWidth, H = innerHeight, w = card.offsetWidth, ht = card.offsetHeight, m = 12, g = 14;
  let x = r.right + g, side = "l";
  if (x + w > W - m) { x = r.left - w - g; side = "r"; }
  if (x < m) { x = Math.max(m, Math.min(W - w - m, r.left)); side = "t"; }
  let y = side === "t" ? r.bottom + g : r.top - 8;
  if (side === "t" && y + ht > H - m) y = r.top - ht - g;
  y = Math.max(m, Math.min(H - ht - m, y));
  card.style.left = Math.round(x) + "px"; card.style.top = Math.round(y) + "px";
  card.style.transformOrigin = side === "l" ? `0 ${Math.round(Math.max(0, Math.min(ht, r.top + r.height / 2 - y)))}px` : side === "r" ? `100% ${Math.round(Math.max(0, r.top + r.height / 2 - y))}px` : "50% 0";
}

function show(a) {
  clearTimeout(tOut);
  if (open && card.classList.contains("on") && !sheetMQ.matches) return; // same profile: keep it where it is
  anchor = a;
  const sheet = sheetMQ.matches;
  card.classList.toggle("sheet", sheet); bk.hidden = !sheet;
  if (!open) { lastFocus = document.activeElement; build(); getRaw().then(() => { if (open) { build(); place(); } }); }
  card.hidden = false; open = true;
  card.getBoundingClientRect(); place();
  requestAnimationFrame(() => { card.classList.add("on"); bk.classList.add("on"); });
  if (sheet) { document.documentElement.classList.add("dp-lock"); card.querySelector(".dp-x").focus({ preventScroll: true }); }
  [document.querySelector('.row[data-copy="relocpe"]'), tkEl].forEach((t) => t && t.setAttribute("aria-expanded", "true"));
}
function hide(refocus) {
  if (!open) return;
  open = false; card.classList.remove("on"); bk.classList.remove("on"); document.documentElement.classList.remove("dp-lock");
  [document.querySelector('.row[data-copy="relocpe"]'), tkEl].forEach((t) => t && t.setAttribute("aria-expanded", "false"));
  const done = () => { if (!open) { card.hidden = true; bk.hidden = true; } };
  RM ? done() : setTimeout(done, 160);
  if (refocus && lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
}

const tkEl = document.getElementById("tk");
const rowEl = document.querySelector('.row[data-copy="relocpe"]');
const triggers = [rowEl, tkEl].filter(Boolean);
if (tkEl) { tkEl.tabIndex = 0; tkEl.setAttribute("role", "button"); tkEl.setAttribute("aria-label", "Статус в Discord — открыть профиль"); }
triggers.forEach((t) => {
  t.setAttribute("aria-haspopup", "dialog"); t.setAttribute("aria-controls", "dp"); t.setAttribute("aria-expanded", "false");
  t.addEventListener("pointerenter", (e) => { if (e.pointerType !== "mouse" || sheetMQ.matches) return; clearTimeout(tOut); clearTimeout(tIn); tIn = setTimeout(() => show(t), open ? 0 : 120); });
  t.addEventListener("pointerleave", (e) => { if (e.pointerType !== "mouse" || sheetMQ.matches) return; clearTimeout(tIn); tOut = setTimeout(() => hide(), 220); });
  t.addEventListener("click", () => { if (sheetMQ.matches) show(t); });
  t.addEventListener("focus", () => { if (!sheetMQ.matches && t.matches(":focus-visible")) show(t); });
  t.addEventListener("blur", () => { if (!sheetMQ.matches) tOut = setTimeout(() => { if (!card.contains(document.activeElement)) hide(); }, 120); });
});
if (tkEl) tkEl.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open ? hide() : show(tkEl); } });
card.addEventListener("pointerenter", () => clearTimeout(tOut));
card.addEventListener("pointerleave", (e) => { if (e.pointerType === "mouse" && !card.classList.contains("sheet")) tOut = setTimeout(() => hide(), 220); });
card.addEventListener("focusout", (e) => { if (!card.classList.contains("sheet") && !card.contains(e.relatedTarget) && !triggers.includes(e.relatedTarget)) hide(); });
bk.addEventListener("click", () => hide(true));
document.addEventListener("keydown", (e) => { if (e.key === "Escape" && open) hide(true); });
addEventListener("scroll", () => { if (open && !card.classList.contains("sheet")) place(); }, { passive: true });
addEventListener("resize", () => { if (open) { card.classList.toggle("sheet", sheetMQ.matches); bk.hidden = !sheetMQ.matches; place(); } });
setInterval(() => { if (open && !document.hidden) { tickTimes(card); card.querySelectorAll("[data-was]").forEach((e) => { e.textContent = ago(+e.dataset.was); }); } }, 1000);

export function popUpdate(m) { model = m; if (open) { build(); place(); } else built = ""; }
