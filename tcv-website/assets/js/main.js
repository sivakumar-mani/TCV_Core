/* Time Cable Vision navigation and enquiry submission. */
const toggle = document.querySelector('.menu-toggle');
const nav = document.querySelector('.nav-links');
function closeMenu() { const plansMenu = nav.querySelector('.plans-nav'); if (plansMenu) plansMenu.open = false; nav.classList.remove('open'); toggle.setAttribute('aria-expanded', 'false'); toggle.setAttribute('aria-label', 'Open navigation'); }
if (toggle && nav) {
 const closeButton = document.createElement('button');
 closeButton.type = 'button';
 closeButton.className = 'menu-close';
 closeButton.setAttribute('aria-label', 'Close navigation');
 closeButton.innerHTML = '<span aria-hidden="true">&times;</span>';
 closeButton.addEventListener('click', () => { closeMenu(); toggle.focus(); });
 nav.prepend(closeButton);
 toggle.addEventListener('click', () => { const open = nav.classList.toggle('open'); toggle.setAttribute('aria-expanded', String(open)); toggle.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation'); });
 nav.querySelectorAll('a').forEach(link => link.addEventListener('click', closeMenu));
 document.addEventListener('keydown', event => { if (event.key === 'Escape') { closeMenu(); toggle.focus(); } });
}
/* Submit both website enquiry forms to the fixed-recipient mail endpoint. */
['quick-enquiry', 'enquiry-form'].forEach(id => {
 const form = document.getElementById(id);
 if (!form) return;
 const status = document.getElementById(id === 'quick-enquiry' ? 'quick-status' : 'enquiry-status');
 const button = form.querySelector('button[type="submit"]');
 let sending = false;
 form.querySelectorAll('input[required]').forEach(input => {
  input.addEventListener('input', () => input.setCustomValidity(''));
 });
 form.addEventListener('submit', async event => {
  event.preventDefault();
  if (sending) return;
  form.querySelectorAll('input[required]').forEach(input => {
   input.setCustomValidity(input.value.trim() ? '' : 'Please enter your details.');
  });
  if (!form.reportValidity()) return;
  sending = true;
  button.disabled = true;
  form.setAttribute('aria-busy', 'true');
  status.textContent = 'Sending your enquiry...';
  try {
   const response = await fetch(form.action, {
    method: 'POST', body: new FormData(form), headers: { Accept: 'application/json' }
   });
   const result = await response.json();
   if (!response.ok || result.success !== true) throw new Error(result.message || 'Unable to send your enquiry. Please try again.');
   status.textContent = result.message;
   form.reset();
  } catch (error) {
   status.textContent = error instanceof SyntaxError || error instanceof TypeError
    ? 'Unable to send your enquiry. Please try again or email tcvadmin@timecablevision.in.'
    : error.message;
  } finally {
   sending = false;
   button.disabled = false;
   form.removeAttribute('aria-busy');
  }
 });
});
const year = document.querySelector('#year');
if (year) year.textContent = String(new Date().getFullYear());
/* Plans disclosure supports pointer, touch and keyboard navigation. */
(() => {
 const menu = document.querySelector('.plans-nav');
 if (!menu) return;
 const summary = menu.querySelector('summary');
 const links = Array.from(menu.querySelectorAll('a'));
 function markCurrentPlan() {
  const currentPage = location.pathname.split('/').pop();
  links.forEach(link => {
   if (link.getAttribute('href') === currentPage) link.setAttribute('aria-current', 'page');
   else link.removeAttribute('aria-current');
  });
 }
 links.forEach(link => link.addEventListener('click', () => { menu.open = false; }));
 document.addEventListener('click', event => { if (!menu.contains(event.target)) menu.open = false; });
 menu.addEventListener('keydown', event => {
  if (event.key === 'Escape' && menu.open) {
   event.stopPropagation();
   event.preventDefault();
   menu.open = false;
   summary.focus();
  }
 });
 window.addEventListener('hashchange', markCurrentPlan);
 markCurrentPlan();
})();
