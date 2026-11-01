import { copyText } from "./presence.js";
export function entrances() {
  const els = [...document.querySelectorAll("[data-in]")];
  if (!("IntersectionObserver" in window)) { els.forEach((e) => e.classList.add("in")); return; }
  const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } }), { rootMargin: "0px 0px -8% 0px" });
  els.forEach((e) => io.observe(e));
  setTimeout(() => els.forEach((e) => e.classList.add("in")), 4000); // never leave content hidden
}
export function copyButtons() {
  const t = document.getElementById("toast");
  let tm;
  document.querySelectorAll("[data-copy]").forEach((b) => b.addEventListener("click", async () => {
    const ok = await copyText(b.dataset.copy);
    if (!t) return;
    t.textContent = ok ? `Ник ${b.dataset.copy} скопирован` : `Не вышло скопировать, ник: ${b.dataset.copy}`;
    t.classList.add("on"); clearTimeout(tm); tm = setTimeout(() => t.classList.remove("on"), 2200);
  }));
}
