'use strict';

// All interactions run in the browser. No API, cookies or enquiry database.
(() => {
  document.documentElement.classList.add('js-enabled');
  const menu = document.querySelector('.menu-toggle');
  const nav = document.querySelector('#main-nav');
  function closeMenu() {
    if (!menu || !nav) return;
    menu.setAttribute('aria-expanded', 'false');
    menu.setAttribute('aria-label', 'Open navigation');
    nav.classList.remove('open');
  }
  menu?.addEventListener('click', () => {
    const open = menu.getAttribute('aria-expanded') !== 'true';
    menu.setAttribute('aria-expanded', String(open));
    menu.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
    nav?.classList.toggle('open', open);
  });
  document.addEventListener('keydown', event => { if (event.key === 'Escape') { closeMenu(); menu?.focus(); } });
  nav?.querySelectorAll('a').forEach(link => link.addEventListener('click', closeMenu));
  window.matchMedia('(min-width: 851px)').addEventListener('change', event => { if (event.matches) closeMenu(); });

  // Progressive enhancement: content stays visible when JS is disabled or unsupported.
  if ('IntersectionObserver' in window && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    document.body.classList.add('js-ready');
    const observer = new IntersectionObserver(entries => entries.forEach(entry => {
      if (entry.isIntersecting) { entry.target.classList.add('visible'); observer.unobserve(entry.target); }
    }), { threshold: 0.08 });
    document.querySelectorAll('.reveal').forEach(element => observer.observe(element));
  }

  const form = document.querySelector('#enquiry-form');
  if (form) {
    const params = new URLSearchParams(window.location.search);
    const service = form.querySelector('#service');
    const pack = form.querySelector('#package');
    if (Array.from(service.options).some(option => option.value === params.get('service'))) service.value = params.get('service');
    if (params.has('package')) pack.value = params.get('package').slice(0, 150);
    form.addEventListener('submit', event => {
      event.preventDefault();
      if (!form.reportValidity()) return;
      const values = new FormData(form);
      const message = ['Hello Time Cable Vision,', '', 'I would like to enquire about ' + values.get('service') + '.',
        'Name: ' + String(values.get('name')).trim(), 'Phone: ' + String(values.get('phone')).trim(),
        values.get('email') ? 'Email: ' + values.get('email') : '',
        values.get('locality') ? 'Locality / PIN code: ' + values.get('locality') : '',
        values.get('package') ? 'Package: ' + values.get('package') : '', '', String(values.get('message')).trim()
      ].filter(line => line !== '').join('\n');
      const status = document.querySelector('#form-status');
      if (event.submitter?.value === 'email') {
        const subject = 'Time Cable Vision — ' + values.get('service') + ' enquiry';
        status.textContent = 'Your email application will open with a draft. Review it and send it there. If no app opens, use the email links above.';
        window.location.href = 'mailto:timecablevision@gmail.com?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(message);
      } else {
        status.textContent = 'WhatsApp will open with your prepared message. Review it and press Send in WhatsApp.';
        window.location.href = 'https://wa.me/919962543540?text=' + encodeURIComponent(message);
      }
    });
  }
})();
