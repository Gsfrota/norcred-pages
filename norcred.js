'use strict';

// A touch-only visual companion; never intercept touch, wheel or keyboard input.
(() => {
  const root = document.documentElement;
  const touchQuery = matchMedia('(pointer: coarse)');
  const contrastQuery = matchMedia('(forced-colors: active)');
  const viewport = window.visualViewport;
  const indicator = document.createElement('div');
  const thumb = document.createElement('span');
  indicator.className = 'scroll-indicator';
  indicator.setAttribute('aria-hidden', 'true');
  thumb.className = 'scroll-indicator__thumb';
  indicator.append(thumb);
  document.body.append(indicator);
  let frame = 0;
  let idleTimer = 0;

  function render() {
    frame = 0;
    const page = document.scrollingElement || root;
    const range = page.scrollHeight - root.clientHeight;
    const enabled = touchQuery.matches && !contrastQuery.matches && range > 1 && (!viewport || viewport.scale === 1);
    root.classList.toggle('has-touch-scrollbar', enabled);
    if (!enabled) return;
    const trackHeight = indicator.clientHeight;
    const thumbHeight = Math.min(trackHeight, Math.max(32, trackHeight * root.clientHeight / page.scrollHeight));
    const progress = Math.max(0, Math.min(1, page.scrollTop / range));
    thumb.style.height = `${thumbHeight}px`;
    thumb.style.transform = `translateY(${progress * (trackHeight - thumbHeight)}px)`;
  }
  function schedule() {
    if (!frame) frame = requestAnimationFrame(render);
  }
  window.addEventListener('scroll', () => {
    if (!touchQuery.matches) return;
    schedule();
    indicator.classList.add('is-scrolling');
    clearTimeout(idleTimer);
    idleTimer = setTimeout(() => indicator.classList.remove('is-scrolling'), 900);
  }, { passive: true });
  window.addEventListener('resize', schedule, { passive: true });
  window.addEventListener('pageshow', schedule);
  touchQuery.addEventListener('change', schedule);
  contrastQuery.addEventListener('change', schedule);
  if (viewport) viewport.addEventListener('resize', schedule, { passive: true });
  if ('ResizeObserver' in window) new ResizeObserver(schedule).observe(document.body);
  render();
})();

/* Supply verified production destinations here; empty entries keep the existing demo dialog. */
const NORCRED_CONFIG = Object.freeze({
  whatsappNumber: '',
  whatsappMessage: 'Olá! Gostaria de conhecer as soluções de crédito da Norcred.',
  simulationUrl: '',
  solutionsUrl: '',
  aboutUrl: '',
  contactUrl: '',
  footerUrls: Object.freeze({
    personalLoan: '', portability: '', referral: '', howItWorks: '', blog: '', careers: '',
    instagram: '', facebook: '', linkedin: '', youtube: '', terms: '', privacy: '', cookies: ''
  })
});

(() => {
  const hero = document.querySelector('.hero');
  if (!hero) return;

  const header = document.querySelector('.site-header');
  const toggle = header.querySelector('.menu-toggle');
  const nav = header.querySelector('.main-nav');
  const dialog = document.querySelector('.connection-dialog');
  const footer = document.querySelector('.site-footer');
  const floatingContact = document.querySelector('.whatsapp-float');
  if (footer && floatingContact && 'IntersectionObserver' in window) {
    new IntersectionObserver(([entry]) => {
      floatingContact.classList.toggle('is-over-footer', entry.isIntersecting);
    }).observe(footer);
  }
  const testimonials = document.querySelector('.testimonials');
  if (testimonials && floatingContact && 'IntersectionObserver' in window) {
    new IntersectionObserver(([entry]) => {
      floatingContact.classList.toggle('is-over-testimonials', entry.isIntersecting);
    }, { threshold: 0.15 }).observe(testimonials);
  }
  const motionQuery = matchMedia('(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)');
  let pointerEnabled = false;
  let heroBounds;
  let pointerFrame = 0;
  let pointerX = 0;
  let pointerY = 0;
  let parallaxLimit = 0;

  // Navigation state follows the actual container layout, including embedded previews.
  function closeMenu({ restoreFocus = false } = {}) {
    nav.classList.remove('is-open');
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-label', 'Abrir menu');
    if (restoreFocus) toggle.focus();
  }

  toggle.addEventListener('click', () => {
    const open = toggle.getAttribute('aria-expanded') !== 'true';
    nav.classList.toggle('is-open', open);
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Fechar menu' : 'Abrir menu');
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') {
      closeMenu({ restoreFocus: true });
    }
  });
  document.addEventListener('pointerdown', event => {
    if (!header.contains(event.target)) closeMenu();
  });
  header.addEventListener('focusout', event => {
    if (event.relatedTarget && !header.contains(event.relatedTarget)) closeMenu();
  });
  nav.addEventListener('click', event => {
    if (event.target.closest('a')) closeMenu();
  });

  // Keep navigation and the existing destination fallback independent from motion.
  function validDestination(value) {
    if (!value || typeof value !== 'string') return '';
    try {
      const url = new URL(value, location.href);
      return ['http:', 'https:', 'mailto:', 'tel:'].includes(url.protocol) ? url.href : '';
    } catch {
      return '';
    }
  }

  const phone = NORCRED_CONFIG.whatsappNumber.replace(/\D/g, '');
  const whatsapp = /^\d{10,15}$/.test(phone)
    ? `https://wa.me/${phone}?text=${encodeURIComponent(NORCRED_CONFIG.whatsappMessage)}` : '';
  const destinations = {
    whatsapp,
    contact: validDestination(NORCRED_CONFIG.contactUrl) || whatsapp,
    simulation: validDestination(NORCRED_CONFIG.simulationUrl),
    solutions: validDestination(NORCRED_CONFIG.solutionsUrl),
    about: validDestination(NORCRED_CONFIG.aboutUrl),
    ...Object.fromEntries(Object.entries(NORCRED_CONFIG.footerUrls).map(([key, value]) => [key, validDestination(value)]))
  };
  const fallback = {
    whatsapp: ['WhatsApp da Norcred', 'O número oficial de WhatsApp ainda não foi conectado a esta página.'],
    contact: ['Fale com a Norcred', 'Este é um protótipo visual. O canal oficial de atendimento ainda não foi conectado.'],
    simulation: ['Simular crédito', 'Este é um protótipo visual. O simulador ainda não foi conectado e nenhuma análise de crédito é realizada nesta página.'],
    solutions: ['Soluções Norcred', 'A página de soluções ainda não foi vinculada a este protótipo.'],
    about: ['Sobre a Norcred', 'A página institucional ainda não foi vinculada a este protótipo.']
  };
  document.querySelectorAll('[data-destination]').forEach(link => {
    const key = link.dataset.destination;
    if (key === 'about' && document.querySelector('#sobre')) {
      link.href = '#sobre';
      return;
    }
    if (key === 'solutions' && document.querySelector('#solucoes')) {
      link.href = '#solucoes';
      return;
    }
    if (key === 'simulation' && document.querySelector('#simular')) {
      link.href = '#simular';
      return;
    }
    if (destinations[key]) {
      link.href = destinations[key];
      return;
    }
    link.addEventListener('click', event => {
      event.preventDefault();
      closeMenu();
      const [title, description] = fallback[key] || [
        link.getAttribute('aria-label') || link.textContent.trim(),
        'Este destino ainda não foi conectado à página. Entre em contato pelo e-mail contato@norcred.com.br.'
      ];
      dialog.querySelector('#dialog-title').textContent = title;
      dialog.querySelector('#dialog-description').textContent = description;
      if (typeof dialog.showModal === 'function') dialog.showModal();
      else window.alert(`${title}\n\n${description}`);
    });
  });
  dialog.addEventListener('click', event => {
    if (event.target !== dialog) return;
    const box = dialog.getBoundingClientRect();
    if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) dialog.close();
  });

  const creditForm = document.querySelector('.credit__form');
  const cpfInput = document.querySelector('#cpf');
  const cpfError = document.querySelector('#cpf-error');
  const consent = document.querySelector('#credit-consent');
  const consentError = document.querySelector('#credit-consent-error');
  const consentStatus = document.querySelector('#credit-consent-status');
  const creditSubmit = creditForm?.querySelector('.credit__submit');
  const quizPanels = [...document.querySelectorAll('[data-quiz-step]')];
  const quizBack = creditForm?.querySelector('.credit-quiz__back');
  const quizProgress = creditForm?.querySelector('.credit-quiz__progress');
  const quizAnswers = [document.querySelector('#quiz-amount'), document.querySelector('#quiz-employment')];
  const quizMotion = matchMedia('(prefers-reduced-motion: reduce)');
  let quizStep = 0;
  let quizBusy = false;
  let quizAnimation;

  async function showQuizStep(next, { animate = true, focus = true } = {}) {
    if (quizBusy || next === quizStep || !quizPanels[next]) return;
    quizBusy = true;
    const outgoing = quizPanels[quizStep];
    const incoming = quizPanels[next];
    const direction = next > quizStep ? 1 : -1;
    const play = async (panel, frames, duration) => {
      if (!animate || quizMotion.matches || !panel.animate) return;
      quizAnimation = panel.animate(frames, { duration, easing: 'cubic-bezier(.22, 1, .36, 1)' });
      await quizAnimation.finished.catch(() => {});
      quizAnimation = null;
    };
    outgoing.inert = true;
    quizBack.disabled = true;
    await play(outgoing, [{ opacity: 1, transform: 'translateX(0)' }, { opacity: 0, transform: `translateX(${-direction * 20}px)` }], 180);
    outgoing.hidden = true;
    outgoing.inert = false;
    incoming.hidden = false;
    quizStep = next;
    document.querySelector('#quiz-step-number').textContent = String(next + 1);
    quizProgress.setAttribute('aria-valuenow', String(next + 1));
    quizProgress.firstElementChild.style.width = `${(next + 1) / 3 * 100}%`;
    incoming.inert = true;
    await play(incoming, [{ opacity: 0, transform: `translateX(${direction * 24}px)` }, { opacity: 1, transform: 'translateX(0)' }], 340);
    incoming.inert = false;
    quizBack.disabled = next === 0;
    quizBusy = false;
    if (focus) incoming.querySelector('.credit-quiz__title').focus({ preventScroll: true });
    creditForm.dispatchEvent(new CustomEvent('norcred:advisor', {
      bubbles: true, detail: { type: 'step', step: next }
    }));
  }

  quizPanels.slice(0, 2).forEach((panel, index) => {
    panel.querySelectorAll('[data-answer]').forEach(button => {
      button.addEventListener('click', () => {
        if (quizBusy || quizStep !== index) return;
        quizAnswers[index].value = button.dataset.answer;
        panel.querySelectorAll('[data-answer]').forEach(option => option.setAttribute('aria-pressed', String(option === button)));
        showQuizStep(index + 1);
      });
    });
  });
  quizBack?.addEventListener('click', () => {
    showQuizStep(quizStep - 1);
  });
  quizMotion.addEventListener('change', () => {
    if (quizMotion.matches) quizAnimation?.finish();
  });
  creditForm?.addEventListener('reset', () => {
    quizAnimation?.finish();
    // Finish any in-flight transition before restoring the first question.
    const resetQuiz = () => {
      if (quizBusy) { requestAnimationFrame(resetQuiz); return; }
      quizAnswers.forEach(answer => { answer.value = ''; });
      creditForm.querySelectorAll('[data-answer]').forEach(button => button.setAttribute('aria-pressed', 'false'));
      cpfError.hidden = true;
      cpfInput.removeAttribute('aria-invalid');
      showQuizStep(0, { animate: false });
    };
    queueMicrotask(resetQuiz);
  });
  function syncConsent({ announce = false } = {}) {
    const accepted = consent.checked;
    creditSubmit.disabled = !accepted;
    creditSubmit.classList.toggle('is-consented', accepted);
    creditSubmit.setAttribute('aria-label', accepted ? 'Analisar crédito' : 'Aceite os termos para continuar');
    consent.removeAttribute('aria-invalid');
    consentError.hidden = true;
    consentError.textContent = '';
    if (announce) consentStatus.textContent = accepted
      ? 'Termos aceitos. O botão Analisar crédito está disponível.'
      : 'Aceite os termos para habilitar a análise de crédito.';
  }
  if (consent && creditSubmit) {
    // Consent stays on this page only; reading either document never accepts it.
    consent.addEventListener('change', () => syncConsent({ announce: true }));
    window.addEventListener('pageshow', () => syncConsent());
    creditForm.addEventListener('reset', () => queueMicrotask(() => syncConsent({ announce: true })));
    syncConsent();
  }
  function formatCPF(value) {
    return value.replace(/\D/g, '').slice(0, 11)
      .replace(/^(\d{3})(\d)/, '$1.$2')
      .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
      .replace(/(\d{3})\.(\d{3})\.(\d{3})(\d)/, '$1.$2.$3-$4');
  }
  function isValidCPF(value) {
    const digits = value.replace(/\D/g, '');
    if (!/^\d{11}$/.test(digits) || /^(\d)\1{10}$/.test(digits)) return false;
    for (let length = 9; length <= 10; length++) {
      let sum = 0;
      for (let i = 0; i < length; i++) sum += Number(digits[i]) * (length + 1 - i);
      const remainder = (sum * 10) % 11;
      if ((remainder === 10 ? 0 : remainder) !== Number(digits[length])) return false;
    }
    return true;
  }
  // Only progress and validity leave the form; never send CPF or answers to media.
  let advisorCPFValid = false;
  function syncCreditVideo() {
    const valid = isValidCPF(cpfInput.value);
    if (valid === advisorCPFValid) return;
    advisorCPFValid = valid;
    creditForm.dispatchEvent(new CustomEvent('norcred:advisor', {
      bubbles: true, detail: { type: 'validity', valid }
    }));
  }
  creditForm?.addEventListener('reset', () => {
    advisorCPFValid = false;
    creditForm.dispatchEvent(new CustomEvent('norcred:advisor', {
      bubbles: true, detail: { type: 'reset' }
    }));
  });
  if (creditForm && cpfInput) {
    cpfInput.addEventListener('input', () => {
      const raw = cpfInput.value;
      const digitPosition = raw.slice(0, cpfInput.selectionStart).replace(/\D/g, '').length;
      cpfInput.value = formatCPF(raw);
      let caret = 0;
      let count = 0;
      while (caret < cpfInput.value.length && count < digitPosition) {
        if (/\d/.test(cpfInput.value[caret])) count++;
        caret++;
      }
      cpfInput.setSelectionRange(caret, caret);
      cpfInput.removeAttribute('aria-invalid');
      cpfError.hidden = true;
      cpfError.textContent = '';
      if (cpfInput.value.replace(/\D/g, '').length === 11 && !isValidCPF(cpfInput.value)) {
        cpfInput.setAttribute('aria-invalid', 'true');
        cpfError.textContent = 'Confira o CPF e digite os 11 números corretamente.';
        cpfError.hidden = false;
      }
      syncCreditVideo();
    });
    creditForm.addEventListener('submit', event => {
      event.preventDefault();
      // Neither Enter nor requestSubmit can bypass the two questions.
      if (quizBusy) return;
      const unanswered = quizAnswers.findIndex(answer => !answer.value);
      if (unanswered !== -1) {
        if (quizStep !== unanswered) showQuizStep(unanswered);
        else quizPanels[unanswered].querySelector('[data-answer]').focus();
        return;
      }
      if (quizStep !== 2) { showQuizStep(2); return; }
      // Guard Enter/requestSubmit too, independently of the disabled button.
      if (!consent || !consent.checked) {
        if (consent) {
          consentError.textContent = 'Concorde com os Termos de Serviço para continuar.';
          consentError.hidden = false;
          consent.setAttribute('aria-invalid', 'true');
          consent.focus();
        }
        return;
      }
      if (!isValidCPF(cpfInput.value)) {
        cpfInput.setAttribute('aria-invalid', 'true');
        cpfError.textContent = cpfInput.value ? 'Confira o CPF e digite os 11 números corretamente.' : 'Digite seu CPF para continuar.';
        cpfError.hidden = false;
        cpfInput.focus();
        return;
      }
      // The simulator needs no CPF: keep personal data out of URLs and storage.
      window.location.assign('analise-credito.html');
    });
  }

  // Event-driven parallax: one coalesced write per pointer frame, no idle loop.
  function resetPointer() {
    cancelAnimationFrame(pointerFrame);
    pointerFrame = 0;
    hero.style.removeProperty('--pointer-x');
    hero.style.removeProperty('--pointer-y');
  }
  function refreshBounds() {
    heroBounds = hero.getBoundingClientRect();
  }
  function movePointer(event) {
    if (event.pointerType !== 'mouse' || !heroBounds) return;
    const normalize = (position, start, size) => Math.max(-1, Math.min(1, ((position - start) / size - .5) * 2));
    const x = normalize(event.clientX, heroBounds.left, heroBounds.width);
    const y = normalize(event.clientY, heroBounds.top, heroBounds.height);
    const magnitude = Math.max(1, Math.hypot(x, y));
    pointerX = x / magnitude * parallaxLimit;
    pointerY = y / magnitude * parallaxLimit;
    if (pointerFrame) return;
    pointerFrame = requestAnimationFrame(() => {
      hero.style.setProperty('--pointer-x', `${pointerX.toFixed(2)}px`);
      hero.style.setProperty('--pointer-y', `${pointerY.toFixed(2)}px`);
      pointerFrame = 0;
    });
  }
  function syncLayout() {
    const styles = getComputedStyle(hero);
    parallaxLimit = parseFloat(styles.getPropertyValue('--parallax-limit')) || 0;
    const enabled = motionQuery.matches && !document.hidden && styles.getPropertyValue('--parallax-enabled').trim() === '1';
    if (enabled !== pointerEnabled) {
      const method = enabled ? 'addEventListener' : 'removeEventListener';
      hero[method]('pointerenter', refreshBounds);
      hero[method]('pointermove', movePointer);
      hero[method]('pointerleave', resetPointer);
      window[method]('scroll', refreshBounds, { passive: true });
      pointerEnabled = enabled;
    }
    resetPointer();
    if (enabled) refreshBounds();
    if (getComputedStyle(toggle).display === 'none') closeMenu();
  }
  motionQuery.addEventListener('change', syncLayout);
  document.addEventListener('visibilitychange', syncLayout);
  if ('ResizeObserver' in window) {
    new ResizeObserver(syncLayout).observe(hero);
  } else {
    window.addEventListener('resize', syncLayout, { passive: true });
  }
  syncLayout();
})();
