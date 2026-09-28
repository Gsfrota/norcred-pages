'use strict';

// Local prerecorded media only: respond to form activity, then wait at an
// inspected open-eye pose. Never read/store/transmit CPF or answer values.
(() => {
  const section = document.querySelector('.credit');
  const video = section?.querySelector('.credit__motion');
  if (!video) return;
  const poster = section.querySelector('.credit__poster');
  const sources = [...section.querySelectorAll('picture source')];
  const toggle = section.querySelector('.credit__motion-toggle');
  const guidance = section.querySelector('.credit__guidance');
  const consent = section.querySelector('#credit-consent');
  const form = section.querySelector('.credit__form');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const restPoints = [0, 2, 4, 7, 9, 10, 12, 14];
  const graceMS = 1000;
  let lastActivity = -Infinity;
  let idleTimer;
  let settleAt = null;
  let laps = 0;
  let previousTime = 0;
  video.defaultPlaybackRate = 1.15;
  video.playbackRate = 1.15;
  const messages = [
    'Vamos começar pelo valor que você precisa.',
    'Agora, informe seu tempo de carteira assinada.',
    'Falta pouco. Confira seu CPF para continuar.'
  ];
  let step = 0;
  let valid = false;
  let cursor = 0;
  let restoreTime = null;
  let visible = false;
  let near = false;
  let userPaused = false;
  let blocked = false;
  let layout = '';
  let source = '';
  let attempt = 0;
  const failed = new Set();

  function state(value) { video.dataset.state = value; }
  function updateToggle() {
    toggle.hidden = reduced.matches || !source;
    const paused = userPaused || blocked;
    toggle.setAttribute('aria-label', paused ? 'Ativar animação da consultora' : 'Desativar animação da consultora');
    toggle.setAttribute('aria-pressed', String(paused));
    toggle.firstElementChild.textContent = paused ? '▶' : 'Ⅱ';
  }
  function updateGuidance() {
    const text = step === 2 && valid
      ? (consent.checked ? 'Tudo preenchido. Você já pode continuar.' : 'Confira os termos para continuar.')
      : messages[step];
    if (guidance.textContent !== text) guidance.textContent = text;
  }
  function active() { return performance.now() - lastActivity < graceMS; }
  function pause(reason = 'paused') {
    attempt++;
    settleAt = null;
    if (restoreTime === null && video.readyState >= 2 && !video.seeking) cursor = video.currentTime;
    video.pause();
    state(reason);
    updateToggle();
  }
  function play() {
    if (!source || !video.readyState || video.seeking || !visible || document.hidden || reduced.matches || userPaused || blocked) {
      updateToggle();
      return;
    }
    if (!active() && settleAt === null) { pause('waiting'); return; }
    if (!video.paused) { state(active() ? 'playing' : 'settling'); return; }
    const token = ++attempt;
    state('loading');
    video.play().catch(() => {
      if (token !== attempt) return;
      blocked = true;
      state('blocked');
      updateToggle();
    });
  }
  function selectSource() {
    const nextLayout = getComputedStyle(section).getPropertyValue('--advisor-layout').trim() || 'desktop';
    if (nextLayout !== layout) {
      layout = nextLayout;
      const image = `assets/advisor-${layout}-presence-v4.webp`;
      // CSS container breakpoints are the authority, even in embedded previews.
      sources.forEach(item => { item.srcset = image; });
      poster.src = image;
      video.dataset.layout = layout;
    }
    if (!near || reduced.matches) return;
    const formats = video.canPlayType('video/mp4; codecs="avc1.64001f"')
      ? ['mp4', 'webm'] : ['webm', 'mp4'];
    const next = formats.map(extension => `assets/advisor-${layout}-presence-v4.${extension}`)
      .find(candidate => !failed.has(candidate));
    if (!next) {
      pause();
      source = '';
      video.classList.remove('has-frame', 'is-playing');
      state('error');
      updateToggle();
      return;
    }
    if (next === source) return;
    pause();
    restoreTime = cursor;
    source = next;
    video.classList.remove('has-frame', 'is-playing');
    state('loading');
    video.muted = true;
    video.loop = true;
    video.defaultPlaybackRate = 1.15;
    video.playbackRate = 1.15;
    laps = 0;
    previousTime = cursor;
    video.src = source;
    video.preload = 'auto';
    video.load();
  }
  function sync() {
    selectSource();
    if (!source) return;
    if (!visible || document.hidden || reduced.matches || userPaused || blocked) {
      pause(blocked ? 'blocked' : 'paused');
    } else if (active()) {
      settleAt = null;
      play();
    } else if (!video.paused) settle();
    else if (video.readyState >= 2 && !video.seeking) state('waiting');
  }

  function settle() {
    if (active() || video.paused || video.seeking || !Number.isFinite(video.duration)) return;
    if (settleAt === null) {
      const next = restPoints.find(point => point >= video.currentTime + .04);
      settleAt = next === undefined ? (laps + 1) * video.duration : laps * video.duration + next;
    }
    state('settling');
  }
  function activity() {
    lastActivity = performance.now();
    clearTimeout(idleTimer);
    idleTimer = setTimeout(sync, graceMS + 20);
    blocked = false;
    sync();
  }
  function frame() {
    if (!video.seeking && restoreTime === null) {
      const time = video.currentTime;
      if (time < previousTime - .5) laps++;
      previousTime = time;
      if (!video.paused && !active()) {
        settle();
        if (settleAt !== null && laps * video.duration + time >= settleAt - .01) pause('waiting');
      }
    }
    if (video.requestVideoFrameCallback) video.requestVideoFrameCallback(frame);
    else requestAnimationFrame(frame);
  }
  frame();

  video.addEventListener('loadedmetadata', () => {
    video.currentTime = Math.min(restoreTime ?? cursor, Math.max(0, video.duration - 1 / 24));
  });
  function showFrame() {
    if (video.seeking || video.readyState < 2) return;
    restoreTime = null;
    cursor = video.currentTime;
    video.classList.add('has-frame');
    sync();
    updateToggle();
  }
  video.addEventListener('loadeddata', showFrame);
  video.addEventListener('seeked', showFrame);
  video.addEventListener('playing', () => {
    if (!visible || document.hidden || reduced.matches || userPaused) { pause(); return; }
    video.classList.add('has-frame', 'is-playing');
    state(active() ? 'playing' : 'settling');
    if (!active()) settle();
    updateToggle();
  });
  video.addEventListener('pause', () => {
    video.classList.remove('is-playing');
  });
  video.addEventListener('error', () => {
    if (!source) return;
    failed.add(source);
    selectSource();
  });
  toggle.addEventListener('click', () => {
    if (blocked) { blocked = false; userPaused = false; }
    else userPaused = !userPaused;
    if (userPaused) sync();
    else activity();
  });
  form.addEventListener('input', activity);
  form.addEventListener('change', activity);
  form.addEventListener('click', event => {
    if (event.target.closest('button, input, select, textarea')) activity();
  });
  section.addEventListener('norcred:advisor', ({ detail }) => {
    if (detail.type === 'reset') {
      step = 0;
      valid = false;
      lastActivity = -Infinity;
      clearTimeout(idleTimer);
    } else if (detail.type === 'step') {
      step = detail.step;
    } else if (detail.type === 'validity') {
      valid = detail.valid;
    }
    updateGuidance();
    sync();
  });
  consent.addEventListener('change', updateGuidance);
  reduced.addEventListener('change', sync);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { lastActivity = -Infinity; clearTimeout(idleTimer); }
    sync();
  });
  window.addEventListener('pagehide', () => {
    lastActivity = -Infinity;
    clearTimeout(idleTimer);
    pause();
  });
  window.addEventListener('pageshow', sync);
  if ('IntersectionObserver' in window) {
    const warm = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) {
        near = true;
        sync();
        warm.disconnect();
      }
    }, { rootMargin: '240px' });
    warm.observe(section);
    new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      sync();
    }).observe(section.querySelector('.credit__visual'));
  } else {
    near = true;
    visible = true;
  }
  if ('ResizeObserver' in window) {
    new ResizeObserver(sync).observe(section);
  }
  else window.addEventListener('resize', sync);
  sync();
})();
