/* Category navigation supports clicks, deep links and keyboard navigation. */
(() => {
  const tabs = Array.from(document.querySelectorAll('[data-tab]'));
  function activate(key, focus = false) {
    const selected = tabs.find(tab => tab.dataset.tab === key) || tabs[0];
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
      activate(tab.dataset.tab);
      history.replaceState(null, '', '#' + tab.dataset.tab);
    });
    tab.addEventListener('keydown', event => {
      let next;
      if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
      if (event.key === 'ArrowLeft') next = (index - 1 + tabs.length) % tabs.length;
      if (event.key === 'Home') next = 0;
      if (event.key === 'End') next = tabs.length - 1;
      if (next === undefined) return;
      event.preventDefault();
      activate(tabs[next].dataset.tab, true);
      history.replaceState(null, '', '#' + tabs[next].dataset.tab);
    });
  });
  window.addEventListener('hashchange', () => activate(location.hash.slice(1)));
  activate(location.hash.slice(1));
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
