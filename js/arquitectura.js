/* ============================================================================
   CLÍNICA RESPIRA · arquitectura.js
   Animaciones específicas de la página de arquitectura: la línea de progreso
   del flujo se rellena al hacer scroll y cada paso se "activa" al llegar.
   Requiere GSAP + ScrollTrigger (ya cargados). Degrada sin problema si faltan.
   ============================================================================ */
(function () {
  'use strict';
  if (typeof window.gsap === 'undefined' || typeof window.ScrollTrigger === 'undefined') return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const flow = document.querySelector('.flow');
  const fill = document.querySelector('.flow-line-fill');

  // La línea de menta se rellena a medida que recorres el flujo.
  if (flow && fill) {
    gsap.to(fill, {
      height: '100%', ease: 'none',
      scrollTrigger: { trigger: flow, start: 'top 55%', end: 'bottom 75%', scrub: 0.6 }
    });
  }

  // Cada paso se resalta cuando entra en el centro de la pantalla.
  document.querySelectorAll('.flow-node').forEach(node => {
    ScrollTrigger.create({
      trigger: node, start: 'top 72%', end: 'bottom 55%',
      onEnter: () => node.classList.add('active'),
      onEnterBack: () => node.classList.add('active')
    });
  });
})();
