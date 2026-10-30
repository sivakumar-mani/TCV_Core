/* Filter the published price list locally; source prices remain unchanged. */
(() => {
 const search = document.getElementById('channel-search');
 const type = document.getElementById('channel-type');
 const rows = Array.from(document.querySelectorAll('.price-table tbody tr'));
 function filter() {
  const query = search.value.trim().toLowerCase();
  let count = 0;
  rows.forEach(row => {
   row.hidden = !row.dataset.name.includes(query) || (type.value !== '' && row.dataset.type !== type.value);
   if (!row.hidden) count++;
  });
  document.getElementById('channel-result-count').textContent = `${count} of ${rows.length} channels`;
  document.getElementById('channel-no-results').hidden = count > 0;
 }
 search.addEventListener('input', filter);
 search.addEventListener('change', filter);
 search.addEventListener('search', filter);
 type.addEventListener('change', filter);
 type.addEventListener('input', filter);
 filter();
})();
