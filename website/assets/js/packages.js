'use strict';
(() => {
  const search = document.querySelector('#package-search');
  const language = document.querySelector('#language-filter');
  const quality = document.querySelector('#quality-filter');
  const cards = Array.from(document.querySelectorAll('[data-package-index]'));
  const packages = window.TCV_PACKAGES || [];
  if (!search || !language || !quality || !packages.length) return;
  const normalize = value => String(value).toLocaleLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  const includes = (value, terms) => terms.every(term => normalize(value).includes(term));
  function filter() {
    const terms = normalize(search.value).split(' ').filter(Boolean);
    let count = 0;
    cards.forEach(card => {
      const pack = packages[Number(card.dataset.packageIndex)];
      const searchable = [pack.name, pack.language, pack.quality, ...pack.channels].join(' ');
      const visible = (!language.value || pack.language === language.value) && (!quality.value || pack.quality === quality.value) && includes(searchable, terms);
      card.hidden = !visible;
      if (visible) count++;
      card.querySelectorAll('.channel-list li').forEach(channel => channel.classList.toggle('match', terms.length > 0 && includes(channel.textContent, terms)));
    });
    document.querySelector('#package-count').textContent = `Showing ${count} of ${packages.length} packages`;
    document.querySelector('.empty-results').hidden = count !== 0;
  }
  search.addEventListener('input', filter);
  language.addEventListener('change', filter);
  quality.addEventListener('change', filter);
  document.querySelector('.reset-filters').addEventListener('click', () => { search.value = ''; language.value = ''; quality.value = ''; filter(); search.focus(); });
  if (window.location.hash) {
    const selected = document.getElementById(decodeURIComponent(window.location.hash.slice(1)));
    selected?.querySelector('details')?.setAttribute('open', '');
  }
})();
