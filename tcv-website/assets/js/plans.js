/* Preserve bookmarks to the former category tabs. */
(() => {
  if (!document.querySelector('[data-plans-index]')) return;
  const key = location.hash.slice(1);
  const pages = {
    catv: 'catv-packages.html',
    internet: 'internet-krishi-packages.html',
    ott: 'internet-krishi-packages.html#internet-ott',
    railwire: 'internet-railwire-packages.html',
    cctv: 'cctv-packages.html',
    solar: 'solar-packages.html'
  };
  const target = key.startsWith('internet-')
    ? 'internet-krishi-packages.html#' + key
    : pages[key];
  if (target) location.replace(target);
})();

/* Native dialog provides focus containment, Escape dismissal and focus return. */
(() => {
  const modal = document.getElementById('channel-modal');
  const content = document.getElementById('channel-modal-content');
  const title = document.getElementById('channel-modal-title');
  if (!modal || !content || !title) return;
  document.querySelectorAll('[data-channel-template]').forEach(button => {
    button.addEventListener('click', () => {
      const template = document.getElementById(button.dataset.channelTemplate);
      title.textContent = button.closest('.plan-card').querySelector('h3').textContent + ' - Channels List';
      content.replaceChildren(template.content.cloneNode(true));
      modal.showModal();
    });
  });
  modal.querySelector('.channel-modal-close').addEventListener('click', () => modal.close());
  modal.addEventListener('click', event => {
    if (event.target !== modal) return;
    const bounds = modal.getBoundingClientRect();
    if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) modal.close();
  });
})();
/* OTT apps use a separate dialog so CATV channel lists stay independent. */
(() => {
  const modal = document.getElementById('ott-modal');
  const content = document.getElementById('ott-modal-content');
  const title = document.getElementById('ott-modal-title');
  if (!modal || !content || !title) return;
  let trigger;
  document.querySelectorAll('[data-ott-template]').forEach(button => {
    button.addEventListener('click', () => {
      const template = document.getElementById(button.dataset.ottTemplate);
      if (!template) return;
      trigger = button;
      title.textContent = button.closest('.plan-card').querySelector('h3').textContent + ' - OTT apps';
      content.replaceChildren(template.content.cloneNode(true));
      content.scrollTop = 0;
      modal.showModal();
    });
  });
  modal.querySelector('.channel-modal-close').addEventListener('click', () => modal.close());
  modal.addEventListener('close', () => trigger?.focus());
  modal.addEventListener('click', event => {
    if (event.target !== modal) return;
    const bounds = modal.getBoundingClientRect();
    if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) modal.close();
  });
})();
/* Krishi package groups support clicks, deep links and keyboard tabs. */
(() => {
  const tabs = Array.from(document.querySelectorAll('[data-internet-tab]'));
  if (!tabs.length) return;
  function activate(key, focus = false) {
    const selected = tabs.find(tab => tab.dataset.internetTab === key) || tabs[0];
    tabs.forEach(tab => {
      const active = tab === selected;
      tab.setAttribute('aria-selected', String(active));
      tab.tabIndex = active ? 0 : -1;
      document.getElementById(tab.getAttribute('aria-controls')).hidden = !active;
    });
    if (focus) selected.focus();
  }
  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => {
      activate(tab.dataset.internetTab);
      history.replaceState(null, '', '#' + tab.dataset.internetTab);
    });
    tab.addEventListener('keydown', event => {
      let next;
      if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
      if (event.key === 'ArrowLeft') next = (index - 1 + tabs.length) % tabs.length;
      if (event.key === 'Home') next = 0;
      if (event.key === 'End') next = tabs.length - 1;
      if (next === undefined) return;
      event.preventDefault();
      activate(tabs[next].dataset.internetTab, true);
      history.replaceState(null, '', '#' + tabs[next].dataset.internetTab);
    });
  });
  window.addEventListener('hashchange', () => activate(location.hash.slice(1)));
  activate(location.hash.slice(1));
})();
