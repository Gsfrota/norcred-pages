'use strict';

(() => {
  if (!('IntersectionObserver' in window) || !Element.prototype.animate) return;

  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const desktop = matchMedia('(min-width: 1024px) and (hover: hover) and (pointer: fine)');
  const activeAnimations = new Map();
  const seen = new WeakSet();
  const scenes = new Map();
  const ease = 'cubic-bezier(.16, 1, .3, 1)';
  const addScene = (selector, children) => {
    document.querySelectorAll(selector).forEach(scene => scenes.set(scene, children));
  };

  addScene('.credit__intro', 'h1, p');
  addScene('.solutions__header', 'h2');
  addScene('.solution-card', '.solution-card__content, .solution-card__art');
  addScene('.simulation-banner__panel', '.simulation-banner__content, .simulation-banner__phone');
  addScene('.faq__header', '.faq__intro, .faq__art');
  addScene('.faq__item', null);
  addScene('.site-footer__columns > *', null);

  function finishFor(element) {
    for (const [animation, target] of activeAnimations) {
      if (target === element || target.contains(element)) {
        animation.cancel();
        activeAnimations.delete(animation);
      }
    }
  }

  const revealObserver = new IntersectionObserver(entries => {
    let stagger = 0;
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const scene = entry.target;
      revealObserver.unobserve(scene);
      if (seen.has(scene)) return;
      seen.add(scene);
      scene.classList.add('is-revealed');
      if (reduced.matches || scene.contains(document.activeElement)) return;
      const selector = scenes.get(scene);
      const targets = selector ? [...scene.querySelectorAll(selector)] : [scene];
      targets.forEach((target, index) => {
        const art = target.matches('img');
        const animation = target.animate([
          { opacity: 0, transform: art ? 'translateY(28px) scale(.94) rotate(-3deg)' : 'translateY(24px)' },
          { opacity: 1, transform: 'none' }
        ], { duration: art ? 1100 : 800, delay: Math.min(stagger * 65, 195) + index * 110, easing: ease, fill: 'backwards' });
        activeAnimations.set(animation, target);
        animation.onfinish = animation.oncancel = () => activeAnimations.delete(animation);
      });
      stagger++;
    });
  }, { threshold: 0, rootMargin: '0px 0px -24px 0px' });

  // Observe scenes without hiding them first: failed scripts and fast anchor jumps stay readable.
  function observeScenes() {
    revealObserver.disconnect();
    if (!reduced.matches) scenes.forEach((_, scene) => {
      if (!seen.has(scene)) revealObserver.observe(scene);
    });
  }

  // Decorative depth follows native scroll. Only visible artwork is updated, once per event frame.
  const artwork = [...document.querySelectorAll('.solution-card__art, .simulation-banner__phone, .faq__art')];
  const visibleArtwork = new Set();
  let frame = 0;
  let scrollEnabled = false;
  const artObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) visibleArtwork.add(entry.target);
      else {
        visibleArtwork.delete(entry.target);
        entry.target.style.removeProperty('translate');
      }
    });
    scheduleDepth();
  });

  function renderDepth() {
    frame = 0;
    if (!scrollEnabled) return;
    const positions = [...visibleArtwork].map(art => {
      const bounds = art.parentElement.getBoundingClientRect();
      const progress = Math.max(-1, Math.min(1, (innerHeight / 2 - bounds.top - bounds.height / 2) / (innerHeight / 2 + bounds.height / 2)));
      return [art, progress * (art.matches('.simulation-banner__phone') ? 20 : 12)];
    });
    positions.forEach(([art, offset]) => { art.style.translate = `0 ${offset.toFixed(2)}px`; });
  }
  function scheduleDepth() {
    if (scrollEnabled && !frame) frame = requestAnimationFrame(renderDepth);
  }
  function syncDepth() {
    scrollEnabled = desktop.matches && !reduced.matches && !document.hidden;
    cancelAnimationFrame(frame);
    frame = 0;
    artObserver.disconnect();
    visibleArtwork.clear();
    window.removeEventListener('scroll', scheduleDepth);
    window.removeEventListener('resize', scheduleDepth);
    artwork.forEach(art => art.style.removeProperty('translate'));
    if (scrollEnabled) {
      artwork.forEach(art => artObserver.observe(art));
      window.addEventListener('scroll', scheduleDepth, { passive: true });
      window.addEventListener('resize', scheduleDepth, { passive: true });
    }
  }

  document.addEventListener('focusin', event => finishFor(event.target));
  function cancelEntrances() {
    activeAnimations.forEach((_, animation) => animation.cancel());
    activeAnimations.clear();
  }
  reduced.addEventListener('change', () => {
    cancelEntrances();
    observeScenes();
    syncDepth();
  });
  desktop.addEventListener('change', syncDepth);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) cancelEntrances();
    syncDepth();
  });
  window.addEventListener('beforeprint', cancelEntrances);
  window.addEventListener('pageshow', syncDepth);
  observeScenes();
  syncDepth();
})();
