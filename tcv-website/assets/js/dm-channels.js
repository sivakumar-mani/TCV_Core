/* Progressive enhancement: the complete source list is readable without JavaScript. */
(() => {
  const form = document.querySelector('#channel-filters');
  if (!form) return;
  const search = document.querySelector('#channel-search');
  const range = document.querySelector('#channel-range');
  const format = document.querySelector('#channel-format');
  const count = document.querySelector('#channel-count');
  const empty = document.querySelector('#channel-empty');
  const channels = Array.from(document.querySelectorAll('.channel-table tbody tr'), row => ({
    row,
    name: row.cells[1].textContent.trim().toLowerCase(),
    lcn: row.cells[2].textContent.trim()
  }));
  function update() {
    const query = search.value.trim().toLowerCase();
    let visible = 0;
    channels.forEach(channel => {
      const hd = /\bhd\b/i.test(channel.name);
      const matches = (!query || channel.name.includes(query) || channel.lcn.includes(query))
        && (range.value === '' || Math.floor(Number(channel.lcn) / 100) * 100 === Number(range.value))
        && (!format.value || (format.value === 'hd' ? hd : !hd));
      channel.row.hidden = !matches;
      if (matches) visible++;
    });
    count.textContent = `Showing ${visible} of ${channels.length} channels`;
    empty.hidden = visible !== 0;
  }
  form.addEventListener('submit', event => event.preventDefault());
  search.addEventListener('input', update);
  range.addEventListener('change', update);
  format.addEventListener('change', update);
  form.addEventListener('reset', () => {
    search.value = '';
    range.value = '';
    format.value = '';
    update();
  });
  form.hidden = false;
  update();
})();
