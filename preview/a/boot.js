import { watch, firstImage, lastSeen, startTicker, tickTimes, copyButtons, scramble, h, fmt, ago, STATUS_RU } from "../shared/presence.js";
const $ = (id) => document.getElementById(id);
const GL = document.documentElement.classList.contains("gl");

scramble($("nick"));
copyButtons();
const clock = $("clock");
const tick = () => { const d = new Date(); clock.textContent = d.toLocaleDateString("ru-RU", { weekday: "short" }).replace(".", "") + " " + d.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" }); };
tick(); setInterval(tick, 10000);

/* Discord window */
const body = $("dcBody"); let curKey = "";
const KIND = { music: "Слушает", game: "Играет", ide: "Пишет код", other: "Сейчас" };
function coverEl(srcs, alt) {
  const c = h("div", "dc-c");
  if (srcs && srcs.length) { const im = h("img"); im.alt = alt; im.width = im.height = 120; c.appendChild(im); firstImage(srcs).then((u) => (u ? (im.src = u) : im.remove())); }
  else c.classList.add("idle");
  return c;
}
function render(m) {
  $("mbDot").dataset.s = m.live ? m.status : "unknown";
  const on = m.live && m.status !== "offline";
  const acts = on ? m.activities : [];
  const main = acts.find((a) => a.kind === "music") || acts[0];
  const ls = m.live && !on ? lastSeen(m) : null;
  const key = !m.live ? "load" : main ? main.key + main.title + main.start + main.end : ls ? "ls" + ls.at : m.status + m.custom;
  const st = h("p", "dc-st"); const d = h("span", "dot"); d.dataset.s = m.live ? m.status : "unknown";
  st.append(d, h("b", "", "relocpe"), " · " + (m.live ? STATUS_RU[m.status] || "" : "подключаюсь") + (on && m.custom ? " · " + m.custom : ""));
  if (key === curKey) { body.replaceChild(st, body.firstChild); return; }
  curKey = key;
  const a = h("div", "dc-a"), meta = h("div");
  if (main) {
    a.appendChild(coverEl(main.art, main.kind === "music" ? "Обложка: " + main.title : main.app));
    meta.append(h("p", "dc-k", KIND[main.kind]), h("p", "dc-t", main.title), h("p", "dc-s", main.sub));
    if (main.end > main.start) {
      const w = h("div"); w.dataset.track = ""; const bar = h("div", "bar"), i = h("i"); i.dataset.bar = ""; bar.appendChild(i);
      const tm = h("p", "tm"); tm.dataset.start = main.start; tm.dataset.end = main.end; const c1 = h("span"), c2 = h("span"); c1.dataset.cur = ""; c2.dataset.tot = ""; tm.append(c1, c2);
      w.append(bar, tm); meta.appendChild(w);
    } else if (main.start) { const e = h("p", "dc-el"), s = h("span"); s.dataset.start = main.start; e.append("уже ", s); meta.appendChild(e); }
  } else if (ls && ls.act) {
    a.classList.add("past"); a.appendChild(coverEl(ls.act.art, "Обложка: " + ls.act.title));
    const k = h("p", "dc-k"), t = h("span"); t.dataset.ago = ls.at; t.textContent = ago(ls.at);
    k.append("был ", t, ls.act.kind === "music" ? " · последний трек" : "");
    meta.append(k, h("p", "dc-t", ls.act.title), h("p", "dc-s", ls.act.sub || ""));
  } else {
    a.appendChild(coverEl(null));
    meta.append(h("p", "dc-k", m.live ? "сейчас тихо" : "секунду"), h("p", "dc-t", m.live ? "Ничего не играет" : "Тяну статус"), h("p", "dc-s", m.live ? "Трек или игра появятся здесь сами" : ""));
  }
  a.appendChild(meta);
  const rest = acts.filter((x) => x !== main);
  const ul = h("ul", "dc-o");
  rest.forEach((x) => { const li = h("li"), n = h("span", "nm"); n.append(h("b", "", x.kind === "music" ? x.title : x.app), x.sub ? " · " + x.sub : ""); const t = h("span", "mono"); if (x.start) t.dataset.start = x.start; li.append(n, t); ul.appendChild(li); });
  body.replaceChildren(st, a, ...(rest.length ? [ul] : []));
  tickTimes(body);
}
render({ live: false, activities: [] });
watch(render);
startTicker(body);

/* menu-bar links jump to a point of the camera path */
document.querySelectorAll("[data-go]").forEach((el) => el.addEventListener("click", (e) => {
  if (!GL) return; e.preventDefault();
  const sp = $("space"), max = sp.offsetHeight - innerHeight;
  scrollTo({ top: max * +el.dataset.go, behavior: "smooth" });
}));

if (GL) {
  import("./a3d.js").then((m) => m.init({ screen: $("screen"), canvas: $("gl"), css: $("css3d"), intro: $("intro"), hint: $("hint"), space: $("space") }))
    .catch((e) => { console.warn("3D off:", e && e.message); document.documentElement.classList.remove("gl"); flat(); });
} else flat();

function flat() {
  const cards = document.querySelectorAll(".card");
  if (!("IntersectionObserver" in window) || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  cards.forEach((c) => c.classList.add("pre"));
  const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.remove("pre"); io.unobserve(e.target); } }), { rootMargin: "0px 0px -10% 0px" });
  cards.forEach((c) => io.observe(c));
  setTimeout(() => cards.forEach((c) => c.classList.remove("pre")), 5000);
}
