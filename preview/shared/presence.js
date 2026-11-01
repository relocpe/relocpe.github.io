// Live Discord presence for the relocpe previews. Data only: each direction draws it its own way.
// Order: Cloudflare Worker proxy (works in Russia without VPN) -> api.lanyard.rest -> local fallback.
export const CFG = {
  id: "1095706197081993279",
  handle: "relocpe",
  presence: "https://samevamp-presence.samevamp.workers.dev/presence",
  avatar: "https://samevamp-presence.samevamp.workers.dev/avatar",
  img: "https://samevamp-presence.samevamp.workers.dev/img",
  lanyard: "https://api.lanyard.rest/v1/users/",
};
export const STATUS_RU = { online: "в сети", idle: "отошёл", dnd: "не беспокоить", offline: "не в сети" };
export const KIND_RU = { 0: "Играет", 1: "Стримит", 2: "Слушает", 3: "Смотрит", 5: "Соревнуется" };

const assetUrl = (img, appId) => {
  if (!img) return "";
  if (img.startsWith("mp:external/")) return "https://media.discordapp.net/external/" + img.slice(12);
  if (img.startsWith("mp:")) return "https://media.discordapp.net/" + img.slice(3);
  if (img.startsWith("spotify:")) return "https://i.scdn.co/image/" + img.slice(8);
  if (/^https?:\/\//.test(img)) return img;
  return appId ? `https://cdn.discordapp.com/app-assets/${appId}/${img}.png?size=160` : "";
};
const viaProxy = (u) => (u ? [CFG.img + "?u=" + encodeURIComponent(u), u] : []);

export const fmt = (ms) => {
  const t = Math.max(0, Math.floor(ms / 1000)), h = Math.floor(t / 3600), m = Math.floor((t % 3600) / 60), s = String(t % 60).padStart(2, "0");
  return h ? `${h}:${String(m).padStart(2, "0")}:${s}` : `${m}:${s}`;
};
export const monogram = (n) => (String(n || "?").replace(/[^\p{L}\p{N} ]/gu, "").trim().split(/\s+/).map((w) => w[0]).join("").slice(0, 2) || "?").toUpperCase();

// Resolve the first image in the list that really loads (blocked hosts hang, so each try has a timeout).
export function firstImage(list) {
  return new Promise((res) => {
    const at = (i) => {
      if (i >= list.length) return res("");
      const im = new Image(); let done = false;
      const fail = () => { if (!done) { done = true; at(i + 1); } };
      const t = setTimeout(() => { im.src = ""; fail(); }, 4000);
      im.onload = () => { clearTimeout(t); if (!done) { done = true; im.naturalWidth ? res(list[i]) : at(i + 1); } };
      im.onerror = () => { clearTimeout(t); fail(); };
      im.src = list[i];
    };
    at(0);
  });
}

function normalize(d) {
  const u = d.discord_user || {};
  const acts = Array.isArray(d.activities) ? d.activities : [];
  const c = acts.find((x) => x.type === 4);
  const custom = c ? [c.emoji && !c.emoji.id ? c.emoji.name : "", c.state || ""].filter(Boolean).join(" ") : "";
  const av = u.avatar ? [CFG.avatar + "?h=" + u.avatar, `https://cdn.discordapp.com/avatars/${u.id}/${u.avatar}.${u.avatar.startsWith("a_") ? "gif" : "png"}?size=256`] : [];
  return {
    live: true,
    status: d.discord_status || "offline",
    name: u.global_name || u.display_name || u.username || CFG.handle,
    avatar: av,
    custom,
    activities: acts.filter((x) => x.type !== 4).map((x) => {
      const as = x.assets || {}, ts = x.timestamps || {};
      const img = assetUrl(as.large_image, x.application_id) || assetUrl(as.small_image, x.application_id);
      return {
        key: x.id || x.name, type: x.type, kind: KIND_RU[x.type] || "", name: x.name || "",
        details: x.details || "", state: x.state || "", art: viaProxy(img),
        start: +ts.start || +x.created_at || 0, end: +ts.end || 0,
      };
    }),
  };
}
export const FALLBACK = { live: false, status: "unknown", name: CFG.handle, avatar: [], custom: "", activities: [] };

// watch(cb): cb(model) on every change. Returns nothing; polls every 20 s while the tab is visible.
export function watch(cb) {
  const urls = [CFG.presence, CFG.lanyard + CFG.id];
  let ok = 0, sig = "";
  const emit = (m) => { const s = JSON.stringify(m); if (s !== sig) { sig = s; cb(m); } };
  const get = (url) => {
    const ac = new AbortController(), to = setTimeout(() => ac.abort(), 3500);
    return fetch(url, { signal: ac.signal, cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((j) => (j && j.success && j.data && j.data.discord_user ? j.data : Promise.reject("bad")))
      .finally(() => clearTimeout(to));
  };
  const poll = async () => {
    for (let k = 0; k < urls.length; k++) {
      const i = (ok + k) % urls.length;
      try { const d = await get(urls[i]); ok = i; emit(normalize(d)); return; } catch {}
    }
    if (!sig) emit(FALLBACK);
  };
  emit(FALLBACK);
  sig = "";
  poll();
  setInterval(() => { if (!document.hidden) poll(); }, 20000);
  document.addEventListener("visibilitychange", () => { if (!document.hidden) poll(); });
}

// Running clocks: elements with data-start / data-end get "1:23 / 3:40" or "12:04"
export function tickTimes(root = document) {
  const now = Date.now();
  root.querySelectorAll("[data-start]").forEach((e) => {
    const st = +e.dataset.start, en = +e.dataset.end || 0;
    if (en > st) {
      e.textContent = `${fmt(Math.min(now, en) - st)} / ${fmt(en - st)}`;
      const bar = e.parentElement && e.parentElement.querySelector("[data-bar]");
      if (bar) bar.style.transform = `scaleX(${Math.min(1, Math.max(0, (now - st) / (en - st))).toFixed(4)})`;
    } else e.textContent = fmt(now - st);
  });
}
export function startTicker() { setInterval(() => { if (!document.hidden) tickTimes(); }, 1000); }

// Copy the Discord handle; calls done(ok)
export async function copyText(t) {
  try { await navigator.clipboard.writeText(t); return true; } catch {}
  try { const a = document.createElement("textarea"); a.value = t; a.style.position = "fixed"; a.style.opacity = "0"; document.body.appendChild(a); a.select(); const ok = document.execCommand("copy"); a.remove(); return ok; } catch { return false; }
}
export const h = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null && txt !== "") e.textContent = txt; return e; };
