'use strict';

(() => {
  const amount = document.querySelector('#credit-amount');
  const terms = [...document.querySelectorAll('input[name="installments"]')];
  const form = document.querySelector('#contact-form');
  const phone = document.querySelector('#whatsapp');
  const email = document.querySelector('#email');
  const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
  const monthlyRate = 0.0499;
  const steps = ['simulation', 'contact', 'result'];
  let currentStep = 'simulation';
  let quote;
  const setText = (id, value) => { document.getElementById(id).textContent = value; };

  function updateQuote() {
    const principal = Number(amount.value);
    const months = Number(terms.find(input => input.checked).value);
    // Fixed-payment amortization. Round each displayed payment to cents so the
    // displayed total agrees with the number of displayed installments.
    const payment = Math.round(principal * monthlyRate / (1 - (1 + monthlyRate) ** -months) * 100) / 100;
    quote = { principal, months, payment, total: Math.round(payment * months * 100) / 100 };
    setText('amount-value', currency.format(principal));
    amount.setAttribute('aria-valuetext', currency.format(principal));
    amount.style.setProperty('--progress', `${(principal - Number(amount.min)) / (Number(amount.max) - Number(amount.min)) * 100}%`);
    setText('monthly-payment', currency.format(payment));
    setText('payment-count', `em ${months}x`);
    setText('total-payment', currency.format(quote.total));
    setText('contact-summary', `${currency.format(principal)} em ${months} parcelas estimadas de ${currency.format(payment)}.`);
    setText('result-amount', currency.format(principal));
    setText('result-monthly', currency.format(payment));
    setText('result-count', `${months} parcelas`);
    setText('result-total', currency.format(quote.total));
  }

  function showStep(step, { push = true, focus = true } = {}) {
    currentStep = step;
    steps.forEach(name => { document.getElementById(`${name}-step`).hidden = name !== step; });
    document.title = `${{ simulation: 'Simule seu crédito', contact: 'Seus dados de contato', result: 'Resultado da simulação' }[step]} — Norcred`;
    if (push) history.pushState({ creditStep: step }, '', location.pathname + location.search);
    if (focus) {
      const target = document.getElementById({ simulation: 'credit-amount', contact: 'contact-title', result: 'result-title' }[step]);
      target.focus({ preventScroll: true });
      window.scrollTo({ top: 0, behavior: 'instant' });
    }
  }

  function clearError(input) {
    input.removeAttribute('aria-invalid');
    const error = document.getElementById(`${input.id}-error`);
    error.hidden = true;
    error.textContent = '';
  }
  function setError(input, message) {
    input.setAttribute('aria-invalid', 'true');
    const error = document.getElementById(`${input.id}-error`);
    error.textContent = message;
    error.hidden = false;
  }
  function nationalPhone(value) {
    let digits = value.replace(/\D/g, '');
    if (digits.length === 13 && digits.startsWith('55')) digits = digits.slice(2);
    return digits;
  }
  const validDDDs = new Set('11 12 13 14 15 16 17 18 19 21 22 24 27 28 31 32 33 34 35 37 38 41 42 43 44 45 46 47 48 49 51 53 54 55 61 62 63 64 65 66 67 68 69 71 73 74 75 77 79 81 82 83 84 85 86 87 88 89 91 92 93 94 95 96 97 98 99'.split(' '));
  function validPhone() {
    const digits = nationalPhone(phone.value);
    return /^[\s()+\d.-]+$/.test(phone.value) && /^\d{2}9\d{8}$/.test(digits) && validDDDs.has(digits.slice(0, 2)) && !/^(\d)\1{8}$/.test(digits.slice(2));
  }
  function validEmail() {
    return email.validity.valid && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value);
  }

  amount.addEventListener('input', updateQuote);
  terms.forEach(input => input.addEventListener('change', updateQuote));
  document.querySelector('#start-contact').addEventListener('click', () => showStep('contact'));
  document.querySelector('#edit-simulation').addEventListener('click', () => showStep('simulation'));
  document.querySelector('#restart-simulation').addEventListener('click', () => {
    form.reset();
    [phone, email].forEach(clearError);
    showStep('simulation');
  });
  [phone, email].forEach(input => input.addEventListener('input', () => clearError(input)));
  phone.addEventListener('blur', () => {
    if (!validPhone()) return;
    const digits = nationalPhone(phone.value);
    phone.value = `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  });
  email.addEventListener('blur', () => { email.value = email.value.trim(); });
  form.addEventListener('submit', event => {
    event.preventDefault();
    if (currentStep !== 'contact') return;
    [phone, email].forEach(clearError);
    email.value = email.value.trim();
    const phoneOK = validPhone();
    const emailOK = validEmail();
    if (!phoneOK) setError(phone, 'Digite um celular válido com DDD. Ex.: (11) 98765-4321.');
    if (!emailOK) setError(email, 'Digite um e-mail válido. Ex.: voce@exemplo.com.br.');
    if (!phoneOK || !emailOK) {
      (phoneOK ? email : phone).focus();
      return;
    }
    // Local estimate only: no request, persistence or invented credit decision.
    updateQuote();
    showStep('result');
  });
  history.replaceState({ creditStep: 'simulation' }, '', location.pathname + location.search);
  window.addEventListener('popstate', event => {
    let step = steps.includes(event.state?.creditStep) ? event.state.creditStep : 'simulation';
    if (step === 'result' && (!validPhone() || !validEmail())) step = 'contact';
    showStep(step, { push: false });
  });
  updateQuote();
  document.querySelector('#start-contact').disabled = false;
})();
