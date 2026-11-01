import { watch, firstImage, dominant, lastSeen, startTicker, tickTimes, copyButtons, scramble, h, fmt, ago, STATUS_RU } from "../shared/presence.js";

const $ = (id) => document.getElementById(id);
const stage = $("stage"), also = $("also");
scramble($("nick"));
copyButtons();
startTicker(document);

const KIND = { music: "Слушает", game: "Играет", ide: "Пишет код", other: "Сейчас" };
let curKey = "", tok = 0;

function cover(srcs, alt, cls = "") {
  const c = h("div", "cover " + cls);
  if (srcs && srcs.length) {
    const im = h("img"); im.alt = alt; im.decoding = "async"; im.width = im.height = 512;
    im.crossOrigin = "anonymous"; c.appendChild(im);
    firstImage(srcs).then((u) => { if (u) { if (!u.includes("workers.dev")) im.removeAttribute("crossorigin"); im.src = u; } else im.remove(); });
  }
  return c;
}
function idleCover() { const c = h("div", "cover idle"); c.appendChild(h("span", "ring")); return c; }

function heroFor(m) {
  const el = h("div", "hero");
  const acts = m.activities || [];
  const main = acts.find((a) => a.kind === "music") || acts.find((a) => a.kind === "game" || a.kind === "ide") || acts[0];
  const meta = h("div", "meta");
  let key, art = null;
  if (m.live && m.status !== "offline" && main) {
    key = main.key + main.title + main.start;
    art = main.art;
    el.appendChild(main.art.length ? cover(main.art, main.kind === "music" ? `Обложка: ${main.title}` : main.app) : idleCover());
    meta.append(h("p", "k", KIND[main.kind]), h("p", "t", main.title), h("p", "a", main.sub));
    if (main.kind === "music" && main.end > main.start) {
      const tr = h("div"); tr.dataset.track = "";
      const bar = h("div", "bar"); const i = h("i"); i.dataset.bar = ""; bar.appendChild(i);
      const tm = h("p", "times"); tm.dataset.start = main.start; tm.dataset.end = main.end;
      tm.append(h("span", "", "0:00"), h("span", "", fmt(main.end - main.start)));
      tm.firstChild.dataset.cur = ""; tm.lastChild.dataset.tot = "";
      tr.append(bar, tm); meta.appendChild(tr);
    } else if (main.start) {
      const e = h("p", "el"); const s = h("span"); s.dataset.start = main.start; e.append(main.kind === "game" ? "в игре " : "уже ", s); meta.appendChild(e);
    }
  } else if (m.live && m.status !== "offline") {
    key = "on-idle";
    el.appendChild(idleCover());
    meta.append(h("p", "k", STATUS_RU[m.status] || "в сети"), h("p", "t", m.custom || "Ничего не запущено"), h("p", "a", "Discord открыт, музыка на паузе"));
  } else {
    const ls = lastSeen(m);
    if (ls && ls.act) {
      key = "past" + ls.at; el.classList.add("past"); art = ls.act.art;
      el.appendChild(ls.act.art && ls.act.art.length ? cover(ls.act.art, `Обложка: ${ls.act.title}`) : idleCover());
      const k = h("p", "k"); const t = h("span"); t.dataset.ago = ls.at; t.textContent = ago(ls.at);
      k.append("был ", t, ls.act.kind === "music" ? " · последний трек" : " · последнее");
      meta.append(k, h("p", "t", ls.act.title), h("p", "a", ls.act.sub || ""));
    } else {
      key = "idle" + (m.live ? "" : "-load");
      el.appendChild(idleCover());
      meta.append(h("p", "k", m.live ? "сейчас тихо" : "подключаюсь к Discord"), h("p", "t", m.live ? "Пока ничего не играет" : "Секунду"),
        h("p", "note", m.live ? "Когда relocpe что-то слушает или запускает, это появится здесь: обложка, трек и время." : "Тяну статус через свой прокси, обычно это меньше секунды."));
    }
  }
  el.appendChild(meta);
  return { el, key, art, mainKey: m.live && m.status !== "offline" && main ? main.key : "" };
}

function swap(el) {
  const old = [...stage.children];
  el.style.opacity = "0"; stage.appendChild(el);
  requestAnimationFrame(() => requestAnimationFrame(() => { el.style.opacity = "1"; old.forEach((o) => { o.style.opacity = "0"; o.setAttribute("aria-hidden", "true"); }); }));
  setTimeout(() => old.forEach((o) => o.remove()), 340);
}

function render(m) {
  const dot = $("dot"); dot.dataset.s = m.live ? m.status : "unknown";
  $("stTxt").textContent = m.live ? STATUS_RU[m.status] || "в сети" : "Discord";
  const { el, key, art, mainKey } = heroFor(m);
  if (key !== curKey) { curKey = key; swap(el); tickTimes(stage); tint(art); }
  else {
    // same activity: refresh timers only
    const ts = stage.lastElementChild && stage.lastElementChild.querySelector("[data-start]"), nt = el.querySelector("[data-start]");
    if (ts && nt) { ts.dataset.start = nt.dataset.start; ts.dataset.end = nt.dataset.end || ""; }
  }
  // secondary activities
  const acts = (m.live && m.status !== "offline" ? m.activities : []);
  also.replaceChildren(...acts.filter((a) => a.key !== mainKey).map((a) => {
    const li = h("li");
    if (a.art.length) { const im = h("img"); im.alt = ""; im.width = im.height = 20; firstImage(a.art).then((u) => u ? (im.src = u) : im.replaceWith(h("span", "ic"))); li.appendChild(im); } else li.appendChild(h("span", "ic"));
    const n = h("span", "n"); n.append(h("b", "", a.kind === "music" ? a.title : a.app)); const sub = a.sub; if (sub) n.append(h("span", "", " · " + sub));
    const t = h("span", "mono"); if (a.start) t.dataset.start = a.start;
    li.append(n, t); return li;
  }));
  tickTimes(also);
}

let tintTok = 0;
async function tint(srcs) {
  const my = ++tintTok;
  const u = srcs && srcs.length ? await firstImage(srcs.filter((s) => s.includes("workers.dev"))) : "";
  const c = u ? await dominant(u) : null;
  if (my !== tintTok) return;
  document.body.style.setProperty("--tint", c ? `color-mix(in srgb, rgb(${c.join(",")}) 6%, #0A0A0B)` : "");
  document.querySelector('meta[name="theme-color"]').content = "#0A0A0B";
}

render({ live: false, status: "unknown", avatar: [], activities: [] });
watch(render);

// hover preview that follows the cursor with a spring (only where hover exists)
const peek = $("peek");
if (matchMedia("(hover:hover) and (pointer:fine)").matches) {
  let x = -999, y = 0, vx = 0, vy = 0, tx = 0, ty = 0, on = false, raf = 0;
  const step = () => {
    const ax = (tx - x) * 0.16, ay = (ty - y) * 0.16; vx = (vx + ax) * 0.68; vy = (vy + ay) * 0.68; x += vx; y += vy;
    const r = Math.max(-6, Math.min(6, vx * 0.4));
    peek.style.transform = `translate3d(${x}px,${y}px,0) rotate(${r}deg) scale(${on ? 1 : 0.92})`;
    raf = on || Math.abs(vx) + Math.abs(vy) > 0.1 ? requestAnimationFrame(step) : 0;
  };
  document.querySelectorAll("[data-media]").forEach((a) => {
    a.addEventListener("pointerenter", (e) => { on = true; tx = e.clientX + 24; ty = e.clientY - 120; if (x < -500) { x = tx; y = ty; } peek.classList.add("on"); if (!raf) raf = requestAnimationFrame(step); });
    a.addEventListener("pointermove", (e) => { tx = e.clientX + 24; ty = Math.min(innerHeight - 250, e.clientY - 120); });
    a.addEventListener("pointerleave", () => { on = false; peek.classList.remove("on"); });
  });
}
