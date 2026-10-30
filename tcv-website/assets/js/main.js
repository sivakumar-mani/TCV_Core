/* Time Cable Vision website interactions. No messages are sent automatically. */
const toggle = document.querySelector('.menu-toggle');
const nav = document.querySelector('.nav-links');
function closeMenu() { nav.classList.remove('open'); toggle.setAttribute('aria-expanded', 'false'); toggle.setAttribute('aria-label', 'Open navigation'); }
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
const form = document.querySelector('#enquiry-form');
if (form) form.addEventListener('submit', event => {
 event.preventDefault();
 form.querySelectorAll('input[required]').forEach(input => input.setCustomValidity(input.value.trim() ? '' : 'Please enter your details.'));
 if (!form.reportValidity()) return;
 const data = new FormData(form);
 const message = `Hello Time Cable Vision, I would like to enquire about ${data.get('service')}.\nName: ${String(data.get('name')).trim()}\nArea: ${String(data.get('area')).trim()}\nDetails: ${String(data.get('message')).trim() || 'Please contact me with more information.'}`;
 const link = document.querySelector('#prepared-enquiry');
 link.href = 'https://wa.me/919962543540?text=' + encodeURIComponent(message);
 link.hidden = false;
 document.querySelector('#enquiry-status').textContent = 'Your enquiry is ready. Open WhatsApp below, review the message, and tap Send.';
 link.focus();
});

if (form) form.querySelectorAll('input[required]').forEach(input => input.addEventListener('input', () => input.setCustomValidity('')));
const year = document.querySelector('#year');
if (year) year.textContent = String(new Date().getFullYear());
