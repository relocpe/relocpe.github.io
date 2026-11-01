import { watch, firstImage, tickTimes, startTicker, STATUS_RU, h, monogram } from "../shared/presence.js";
import { entrances, copyButtons } from "../shared/common.js";
const $ = (id) => document.getElementById(id);
const VERB = { 0: "играет в", 1: "стримит", 2: "слушает", 3: "смотрит", 5: "соревнуется в" };
const IDLE = { online: "в сети", idle: "отошёл", dnd: "просит не беспокоить", offline: "не в сети" };
let coverKey = "", avKey = "", avatarUrl = "";
const timeRow = (a, bar) => {
  const t = h("div", bar ? "time" : "at"), lab = h("span"); lab.dataset.start = a.start; if (a.end) lab.dataset.end = a.end; t.append(lab);
  if (bar && a.end > a.start) { const b = h("span", "bar"), f = h("i"); f.dataset.bar = ""; b.append(f); t.append(b); }
  return t;
};
watch(async (m) => {
  document.body.className = m.live ? m.status : "";
  // the headline is the live status: "relocpe слушает …"
  const lead = m.activities.find((a) => a.type === 2) || m.activities[0];
  $("sayV").textContent = !m.live ? "" : lead ? `${VERB[lead.type] || "занят"} ${lead.type === 2 && lead.details ? lead.details : lead.name}` : IDLE[m.status] || "";
  const L = $("sayV").textContent.length; $("name").classList.toggle("long", L > 16 && L <= 30); $("name").classList.toggle("xl", L > 30);
  $("st").textContent = m.live ? "Discord: " + (STATUS_RU[m.status] || m.status) : "Discord: статус не загрузился";
  $("custom").textContent = m.custom; $("custom").hidden = !m.custom;
  const main = $("main"), more = $("more"); main.textContent = more.textContent = "";
  if (lead) {
    main.dataset.act = "";
    main.append(h("p", "k", lead.kind), h("p", "n", lead.name));
    [lead.details, lead.state].filter(Boolean).forEach((d) => main.append(h("p", "d", d)));
    if (lead.start) main.append(timeRow(lead, true));
  } else if (m.live) { delete main.dataset.act; main.append(h("p", "d", m.status === "offline" ? "Сейчас не в Discord." : "Сейчас ничего не запущено.")); }
  m.activities.filter((a) => a !== lead).slice(0, 3).forEach((a) => {
    const row = h("div", "act"); row.dataset.act = "";
    const art = h("div", "act-art", monogram(a.name)); art.setAttribute("aria-hidden", "true");
    if (a.art.length) firstImage(a.art).then((u) => { if (u) { const im = new Image(); im.src = u; im.alt = ""; art.textContent = ""; art.append(im); } });
    const tx = h("div"); tx.append(h("p", "a1", `${a.kind} ${a.name}`)); const d = [a.details, a.state].filter(Boolean).join(" · "); if (d) tx.append(h("p", "a2", d));
    row.append(art, tx, a.start ? timeRow(a, false) : h("span"));
    more.append(row);
  });
  tickTimes();
  const ak = m.avatar.join("|");
  if (ak && ak !== avKey) { avKey = ak; const u = await firstImage(m.avatar); if (u) { avatarUrl = u; $("topAv").src = u; if (coverKey === "avatar") $("cover").src = u; } }
  // big cover: album art / game art of the lead activity, else the avatar
  const ck = lead && lead.art.length ? lead.art.join("|") : "avatar";
  if (ck !== coverKey) {
    coverKey = ck; const cv = $("cover");
    const u = ck === "avatar" ? avatarUrl : await firstImage(lead.art);
    if (coverKey !== ck) return;
    cv.src = u || avatarUrl || "../shared/discord-avatar.png";
    cv.alt = u && ck !== "avatar" ? `Обложка: ${lead.details || lead.name}` : "Аватар relocpe в Discord";
  }
});
startTicker(); entrances(); copyButtons();
