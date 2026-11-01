// Live Discord presence for the relocpe previews (round 2). Data only; each direction draws it its own way.
// Source order: Cloudflare Worker proxy (works in Russia without VPN) -> api.lanyard.rest. No local fallback avatar:
// the avatar is the current Discord one at 512px through the /img proxy, or nothing.
export const CFG = {
  id: "1095706197081993279",
  handle: "relocpe",
  presence: "https://samevamp-presence.samevamp.workers.dev/presence",
  img: "https://samevamp-presence.samevamp.workers.dev/img",
  lanyard: "https://api.lanyard.rest/v1/users/",
};
export const STATUS_RU = { online: "в сети", idle: "отошёл", dnd: "не беспокоить", offline: "не в сети" };
export const PROJECTS = [
  { id: "ya", name: "Ya.Music-RPC", url: "https://github.com/relocpe/Ya.Music-RPC",
    text: "Показывает трек из Яндекс Музыки в статусе Discord и добавляет мини-плеер в строку меню.",
    meta: "Swift · macOS, Apple Silicon · MIT", shot: "ya-music-rpc.jpg" },
  { id: "nimbus", name: "Nimbus", url: "https://github.com/relocpe/Nimbus",
    text: "Оболочка для zapret в строке меню: Discord и YouTube без блокировок и без терминала.",
    meta: "C, Swift · macOS 14+ · MIT" },
];

const proxy = (u) => CFG.img + "?u=" + encodeURIComponent(u);
const assetUrl = (img, appId) => {
  if (!img) return "";
  if (img.startsWith("mp:external/")) return "https://media.discordapp.net/external/" + img.slice(12);
  if (img.startsWith("mp:")) return "https://media.discordapp.net/" + img.slice(3);
  if (img.startsWith("spotify:")) return "https://i.scdn.co/image/" + img.slice(8);
  if (/^https?:\/\//.test(img)) return img;
  return appId ? `https://cdn.discordapp.com/app-assets/${appId}/${img}.png?size=512` : "";
};
const viaProxy = (u) => (u ? [proxy(u), u] : []);

export const fmt = (ms) => {
  const t = Math.max(0, Math.floor(ms / 1000)), h = Math.floor(t / 3600), m = Math.floor((t % 3600) / 60), s = String(t % 60).padStart(2, "0");
  return h ? `${h}:${String(m).padStart(2, "0")}:${s}` : `${m}:${s}`;
};
const plural = (n, a, b, c) => { const m10 = n % 10, m100 = n % 100; return m10 === 1 && m100 !== 11 ? a : m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14) ? b : c; };
export function ago(ts) {
  const s = Math.max(0, (Date.now() - ts) / 1000);
  if (s < 90) return "только что";
  const m = Math.round(s / 60); if (m < 60) return `${m} ${plural(m, "минуту", "минуты", "минут")} назад`;
  const h = Math.round(m / 60); if (h < 24) return `${h} ${plural(h, "час", "часа", "часов")} назад`;
  const d = Math.round(h / 24); if (d === 1) return "вчера";
  return `${d} ${plural(d, "день", "дня", "дней")} назад`;
}

// First image in the list that really loads (blocked hosts hang, so each try has a timeout)
export function firstImage(list) {
  return new Promise((res) => {
    const at = (i) => {
      if (i >= list.length) return res("");
      const im = new Image(); let done = false;
      if (list[i].startsWith(CFG.img)) im.crossOrigin = "anonymous";
      const fail = () => { if (!done) { done = true; at(i + 1); } };
      const t = setTimeout(() => { im.src = ""; fail(); }, 5000);
      im.onload = () => { clearTimeout(t); if (!done) { done = true; im.naturalWidth >= 256 || !list[i].includes("/avatars/") ? res(list[i]) : at(i + 1); } };
      im.onerror = () => { clearTimeout(t); fail(); };
      im.src = list[i];
    };
    at(0);
  });
}

// Dominant colour of a CORS image (proxy answers with ACAO), [r,g,b] or null
export function dominant(url) {
  return new Promise((res) => {
    if (!url) return res(null);
    const im = new Image(); im.crossOrigin = "anonymous";
    im.onload = () => {
      try {
        const c = document.createElement("canvas"); c.width = c.height = 24;
        const g = c.getContext("2d", { willReadFrequently: true }); g.drawImage(im, 0, 0, 24, 24);
        const d = g.getImageData(0, 0, 24, 24).data; let r = 0, gg = 0, b = 0, w = 0;
        for (let i = 0; i < d.length; i += 4) {
          const mx = Math.max(d[i], d[i + 1], d[i + 2]), mn = Math.min(d[i], d[i + 1], d[i + 2]);
          const k = 0.15 + (mx - mn) / 255; r += d[i] * k; gg += d[i + 1] * k; b += d[i + 2] * k; w += k;
        }
        res([r / w, gg / w, b / w].map(Math.round));
      } catch { res(null); }
    };
    im.onerror = () => res(null);
    im.src = url;
  });
}

function act(x) {
  const as = x.assets || {}, ts = x.timestamps || {};
  const img = assetUrl(as.large_image, x.application_id) || assetUrl(as.small_image, x.application_id);
  const music = x.type === 2;
  // Spotify: details = track, state = artist. Ya.Music-RPC: name = artist, details = track.
  const artist = music ? (x.state || (x.name !== "Spotify" ? x.name : "")) : "";
  const kind = music ? "music" : /code|studio|cursor|zed|xcode|intellij|webstorm|pycharm|neovim|vim|sublime/i.test(x.name || "") ? "ide" : x.type === 0 ? "game" : "other";
  return {
    key: x.id || x.name, type: x.type, kind, app: x.name || "",
    title: music ? x.details || x.name || "" : x.name || "",
    sub: music ? artist : [x.details, x.state].filter(Boolean).join(" · "),
    details: x.details || "", state: x.state || "", artist,
    art: viaProxy(img), start: +ts.start || +x.created_at || 0, end: +ts.end || 0,
  };
}
function normalize(d) {
  const u = d.discord_user || {};
  const acts = Array.isArray(d.activities) ? d.activities : [];
  const c = acts.find((x) => x.type === 4);
  const custom = c ? [c.emoji && !c.emoji.id ? c.emoji.name : "", c.state || ""].filter(Boolean).join(" ") : "";
  const av = u.avatar ? `https://cdn.discordapp.com/avatars/${u.id}/${u.avatar}.${u.avatar.startsWith("a_") ? "webp" : "png"}?size=512` : "";
  let list = acts.filter((x) => x.type !== 4).map(act);
  // Ya.Music-RPC and Spotify can both report the same song: keep the one with a timeline
  const seen = new Map();
  list = list.filter((a) => { if (a.kind !== "music") return true; const k = a.title.toLowerCase(); const p = seen.get(k); if (!p) { seen.set(k, a); return true; } if (!p.end && a.end) { Object.assign(p, a); } return false; });
  const kv = d.kv || {};
  return {
    live: true, status: d.discord_status || "offline",
    name: u.global_name || u.display_name || u.username || CFG.handle,
    avatar: av ? [proxy(av), av] : [], custom, activities: list,
    kvLast: kv.last_track ? { title: kv.last_track, sub: kv.last_artist || "", at: +kv.last_seen || 0 } : null,
  };
}
export const FALLBACK = { live: false, status: "unknown", name: CFG.handle, avatar: [], custom: "", activities: [], kvLast: null };

// Last seen activity, kept in this browser so an offline visit still has something to show
const LS = "relocpe:last";
function remember(m) {
  if (!m.live || m.status === "offline") return;
  try {
    const prev = JSON.parse(localStorage.getItem(LS) || "null") || {};
    const a = m.activities.find((x) => x.kind === "music") || m.activities[0];
    const rec = { at: Date.now(), act: a ? { kind: a.kind, title: a.title, sub: a.sub, app: a.app, art: a.art } : prev.act || null };
    localStorage.setItem(LS, JSON.stringify(rec));
  } catch {}
}
export function lastSeen(m) {
  let r = null;
  try { r = JSON.parse(localStorage.getItem(LS) || "null"); } catch {}
  if (m && m.kvLast && (!r || m.kvLast.at > r.at)) r = { at: m.kvLast.at, act: { kind: "music", title: m.kvLast.title, sub: m.kvLast.sub, art: [] } };
  return r && r.at ? r : null;
}

// watch(cb): cb(model) on every change; polls every 20 s while visible
export function watch(cb) {
  const urls = [CFG.presence, CFG.lanyard + CFG.id];
  let ok = 0, sig = "";
  const emit = (m) => { const s = JSON.stringify(m); if (s !== sig) { sig = s; cb(m); } };
  const get = (url) => {
    const ac = new AbortController(), to = setTimeout(() => ac.abort(), 4000);
    return fetch(url, { signal: ac.signal, cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((j) => (j && j.success && j.data && j.data.discord_user ? j.data : Promise.reject("bad")))
      .finally(() => clearTimeout(to));
  };
  const poll = async () => {
    for (let k = 0; k < urls.length; k++) {
      const i = (ok + k) % urls.length;
      try { const d = await get(urls[i]); ok = i; const m = normalize(d); remember(m); emit(m); return; } catch {}
    }
    if (!sig) emit(FALLBACK);
  };
  poll();
  setInterval(() => { if (!document.hidden) poll(); }, 20000);
  document.addEventListener("visibilitychange", () => { if (!document.hidden) poll(); });
}

// Running clocks: [data-start]/[data-end] -> "1:23" or elapsed; [data-bar] sibling gets scaleX
export function tickTimes(root = document) {
  const now = Date.now();
  root.querySelectorAll("[data-start]").forEach((e) => {
    const st = +e.dataset.start, en = +e.dataset.end || 0;
    if (en > st) {
      const cur = e.querySelector("[data-cur]"), tot = e.querySelector("[data-tot]");
      if (cur) { cur.textContent = fmt(Math.min(now, en) - st); if (tot) tot.textContent = fmt(en - st); }
      else e.textContent = `${fmt(Math.min(now, en) - st)} / ${fmt(en - st)}`;
      const box = e.closest("[data-track]") || e.parentElement, bar = box && box.querySelector("[data-bar]");
      if (bar) bar.style.transform = `scaleX(${Math.min(1, Math.max(0, (now - st) / (en - st))).toFixed(4)})`;
    } else e.textContent = fmt(now - st);
  });
  root.querySelectorAll("[data-ago]").forEach((e) => { e.textContent = ago(+e.dataset.ago); });
}
export function startTicker(root) { tickTimes(root); setInterval(() => { if (!document.hidden) tickTimes(root); }, 1000); }

export async function copyText(t) {
  try { await navigator.clipboard.writeText(t); return true; } catch {}
  try { const a = document.createElement("textarea"); a.value = t; a.style.position = "fixed"; a.style.opacity = "0"; document.body.appendChild(a); a.select(); const ok = document.execCommand("copy"); a.remove(); return ok; } catch { return false; }
}
// Copy buttons: [data-copy] with a .cp-l label inside; label morphs to «скопировано» and back
export function copyButtons(root = document) {
  root.querySelectorAll("[data-copy]").forEach((b) => {
    const l = b.querySelector(".cp-l") || b, orig = l.textContent; let tm;
    b.addEventListener("click", async () => {
      const ok = await copyText(b.dataset.copy);
      const w0 = b.offsetWidth; l.textContent = ok ? "скопировано" : "не вышло"; b.classList.add("done");
      const w1 = b.offsetWidth; b.animate([{ width: w0 + "px" }, { width: w1 + "px" }], { duration: 420, easing: SPRING });
      clearTimeout(tm); tm = setTimeout(() => { const a = b.offsetWidth; l.textContent = orig; b.classList.remove("done"); const z = b.offsetWidth; b.animate([{ width: a + "px" }, { width: z + "px" }], { duration: 420, easing: SPRING }); }, 1600);
    });
  });
}
export const SPRING = "linear(0, 0.009, 0.035 2.1%, 0.141 4.4%, 0.281 6.7%, 0.723 12.9%, 0.938 16.7%, 1.017 19.4%, 1.077 22.4%, 1.101 25.6%, 1.099 28.5%, 1.077 32.3%, 1.017 40.7%, 0.996 46.3%, 0.991 53.6%, 1 71.4%, 1)";
export const h = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null && txt !== "") e.textContent = txt; return e; };

// <relocpe /> scramble: fixed-width mono cells, <=20 updates/s, aria-label holds the real text
const GLYPHS = "!<>-_\\/[]{}=+*^?#01x%&$";
export function scramble(el, { word = "relocpe", hover = true, every = 0 } = {}) {
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  el.setAttribute("aria-label", "<" + word + " />");
  el.innerHTML = '<span class="nk-b" aria-hidden="true">&lt;</span><span class="nk-w" aria-hidden="true"></span><span class="nk-b" aria-hidden="true">&nbsp;/&gt;</span>';
  const w = el.querySelector(".nk-w");
  const spans = [...word].map((ch) => { const s = document.createElement("span"); s.textContent = ch; w.appendChild(s); return s; });
  if (reduce) return;
  let run = null, last = 0, raf = 0;
  const loop = (t) => {
    if (t - last >= 50) {
      last = t; let done = true;
      spans.forEach((sp, i) => {
        const r = run[i]; let ch = word[i], g = false;
        if (t < r.e) { done = false; if (t >= r.s) { ch = GLYPHS[(Math.random() * GLYPHS.length) | 0]; g = true; } }
        if (sp.textContent !== ch) sp.textContent = ch;
        if (sp._g !== g) { sp._g = g; sp.classList.toggle("g", g); }
      });
      if (done) { run = null; raf = 0; return; }
    }
    raf = requestAnimationFrame(loop);
  };
  const go = (delay = 0) => {
    if (run) return; const t = performance.now() + delay;
    run = spans.map((_, i) => ({ s: t + i * 40, e: t + i * 40 + 280 + Math.random() * 300 }));
    raf = requestAnimationFrame(loop);
  };
  go(500);
  if (hover) el.addEventListener("pointerenter", () => go());
  if (every) setInterval(() => { if (!document.hidden) go(); }, every);
  return go;
}
