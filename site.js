// Menos Pista · interações do site (menu, cabeçalho, revelar ao rolar, 3D com ponteiro). Leve e sem dependências.
(() => {
  "use strict";
  const d = document;
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const fine = matchMedia("(hover: hover) and (pointer: fine)").matches;
  d.documentElement.classList.add("js");

  // Menu mobile
  const toggle = d.getElementById("menuToggle"), nav = d.getElementById("navLinks");
  if (toggle && nav) {
    const set = (open) => { nav.classList.toggle("open", open); toggle.setAttribute("aria-expanded", String(open)); toggle.setAttribute("aria-label", open ? "Fechar menu" : "Abrir menu"); };
    toggle.addEventListener("click", () => set(!nav.classList.contains("open")));
    nav.querySelectorAll("a").forEach((a) => a.addEventListener("click", () => set(false)));
    d.addEventListener("keydown", (e) => { if (e.key === "Escape") set(false); });
    d.addEventListener("click", (e) => { if (nav.classList.contains("open") && !nav.contains(e.target) && !toggle.contains(e.target)) set(false); });
  }

  // Cabeçalho ganha borda ao rolar
  const header = d.querySelector(".header");
  if (header) { const on = () => header.classList.toggle("scrolled", scrollY > 8); on(); addEventListener("scroll", on, { passive: true }); }

  // Revelar ao rolar
  const items = d.querySelectorAll(".reveal");
  if (reduce || !("IntersectionObserver" in window)) items.forEach((el) => el.classList.add("in"));
  else {
    const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } }), { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });
    items.forEach((el) => io.observe(el));
  }

  // Contadores
  d.querySelectorAll("[data-count]").forEach((el) => {
    const end = Number(el.dataset.count), suf = el.dataset.suffix || "";
    if (reduce || !("IntersectionObserver" in window)) { el.textContent = end + suf; return; }
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return; io.disconnect();
      const t0 = performance.now();
      const step = (t) => { const p = Math.min(1, (t - t0) / 1100); el.textContent = Math.round(end * (1 - Math.pow(1 - p, 3))) + suf; if (p < 1) requestAnimationFrame(step); };
      requestAnimationFrame(step);
    });
    io.observe(el);
  });

  if (reduce || !fine) return;
  // Celular 3D segue o ponteiro
  const stage = d.querySelector(".stage"), phone = d.querySelector(".phone3d");
  if (stage && phone) {
    stage.addEventListener("pointermove", (e) => {
      const r = stage.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
      phone.style.animation = "none";
      phone.style.transform = `rotateY(${(-14 + x * 26).toFixed(1)}deg) rotateX(${(6 - y * 16).toFixed(1)}deg)`;
    });
    stage.addEventListener("pointerleave", () => { phone.style.transform = ""; phone.style.animation = ""; });
  }
  // Brilho que segue o ponteiro nos cards
  d.querySelectorAll(".feature").forEach((c) => c.addEventListener("pointermove", (e) => {
    const r = c.getBoundingClientRect();
    c.style.setProperty("--mx", `${e.clientX - r.left}px`); c.style.setProperty("--my", `${e.clientY - r.top}px`);
  }));
  // CTA magnético
  d.querySelectorAll(".cta-action").forEach((cta) => {
    cta.addEventListener("pointermove", (e) => {
      const r = cta.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
      cta.style.transform = `translateY(-3px) perspective(600px) rotateX(${(-y * 6).toFixed(2)}deg) rotateY(${(x * 8).toFixed(2)}deg)`;
    });
    cta.addEventListener("pointerleave", () => { cta.style.transform = ""; });
  });
})();
