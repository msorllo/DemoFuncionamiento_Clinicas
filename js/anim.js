/* ============================================================================
   CLÍNICA RESPIRA · anim.js
   Capa de animación premium: GSAP para las animaciones + IntersectionObserver
   para DISPARARLAS (fiable también con elementos visibles al cargar, algo que
   ScrollTrigger.onEnter no garantiza cuando Lenis controla el scroll).
   ScrollTrigger se usa solo para el parallax (scrub). Lenis aporta scroll suave.
   Mejora progresiva: sin GSAP o con "reduce motion", se muestra todo sin animar.
   ============================================================================ */
function initAnim() {
  'use strict';

  const root = document.documentElement;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const hasGSAP = typeof window.gsap !== 'undefined';
  const $$ = (s, c) => Array.from((c || document).querySelectorAll(s));

  /* ---- Header, botón flotante y FAQ (no dependen de GSAP) ------------------ */
  const header = document.getElementById('header');
  const floatCta = document.getElementById('floatCta');
  function onScroll() {
    const y = window.scrollY;
    if (header) header.classList.toggle('scrolled', y > 12);
    if (floatCta) floatCta.classList.toggle('show', y > 760);
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  $$('.faq-q').forEach(q => {
    q.addEventListener('click', () => {
      const item = q.closest('.faq-item');
      const ans = item.querySelector('.faq-a');
      const open = item.classList.toggle('open');
      ans.style.maxHeight = open ? ans.scrollHeight + 'px' : '0';
    });
  });

  /* ---- Sin GSAP o con menos movimiento: mostrar todo y salir --------------- */
  if (!hasGSAP || reduced) {
    root.classList.remove('anim-ready');
    return;
  }

  gsap.registerPlugin(ScrollTrigger);

  /* ---- Scroll suave en links de navegación (nativo, sin Lenis) ------------ */
  $$('a[href^="#"]').forEach(a => {
    a.addEventListener('click', (e) => {
      const id = a.getAttribute('href');
      if (id.length > 1) {
        const el = document.querySelector(id);
        if (el) { e.preventDefault(); el.scrollIntoView({ behavior: 'smooth' }); }
      }
    });
  });

  /* ---- Disparador genérico por IntersectionObserver ----------------------- */
  function onView(el, cb, threshold) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => { if (e.isIntersecting) { cb(); io.unobserve(e.target); } });
    }, { threshold: threshold || 0.15, rootMargin: '0px 0px -6% 0px' });
    io.observe(el);
  }

  /* ---- Reveal on scroll (GSAP disparado por IO) --------------------------- */
  const variants = {
    up: { y: 44, opacity: 0 },
    zoom: { scale: 0.94, opacity: 0 },
    left: { x: -44, opacity: 0 },
    right: { x: 44, opacity: 0 }
  };
  const order = new Map();
  $$('[data-reveal]').forEach(el => {
    const p = el.parentElement;
    const i = order.get(p) || 0; order.set(p, i + 1);
    const v = variants[el.dataset.reveal] || variants.up;
    onView(el, () => {
      gsap.fromTo(el, v, {
        y: 0, x: 0, scale: 1, opacity: 1, duration: 0.95, ease: 'power3.out',
        delay: Math.min(i * 0.07, 0.35)
      });
    });
  });

  /* ---- Parallax (ScrollTrigger scrub: sí se actualiza con Lenis) ---------- */
  $$('[data-parallax]').forEach(el => {
    const speed = parseFloat(el.dataset.parallax) || 0.1;
    gsap.to(el, {
      yPercent: -speed * 100, ease: 'none',
      scrollTrigger: { trigger: el.closest('section') || el, start: 'top bottom', end: 'bottom top', scrub: true }
    });
  });

  /* ---- Tarjetas flotantes del hero ---------------------------------------- */
  $$('[data-float]').forEach((el, i) => {
    gsap.to(el, { y: i % 2 ? 13 : -13, duration: 2.6 + i * 0.5, ease: 'sine.inOut', yoyo: true, repeat: -1 });
  });

  /* ---- Contadores --------------------------------------------------------- */
  $$('[data-count]').forEach(el => {
    const end = parseFloat(el.dataset.count);
    const obj = { v: 0 };
    onView(el, () => gsap.to(obj, { v: end, duration: 1.6, ease: 'power2.out', onUpdate: () => { el.textContent = Math.round(obj.v); } }), 0.4);
  });

  /* ---- Burbujas del chat (entran escalonadas) ----------------------------- */
  const bubbles = $$('[data-chat]');
  if (bubbles.length) {
    gsap.set(bubbles, { opacity: 0, y: 16 });
    onView(bubbles[0], () => gsap.to(bubbles, { opacity: 1, y: 0, duration: 0.5, stagger: 0.55, ease: 'power2.out' }), 0.2);
  }

  window.addEventListener('load', () => ScrollTrigger.refresh());
}

/* Ejecutar cuando el DOM esté listo (después de que landing.js genere las
   tarjetas de servicio dinámicas, para que también reciban animación). */
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initAnim);
} else {
  initAnim();
}
