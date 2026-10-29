/* Homepage enquiry composer. Visitors review and send in WhatsApp. */
const quickForm = document.querySelector('#quick-enquiry');
if (quickForm) {
  const nameInput = quickForm.elements.namedItem('name');
  nameInput.addEventListener('input', () => nameInput.setCustomValidity(''));
  quickForm.addEventListener('submit', event => {
    event.preventDefault();
    nameInput.setCustomValidity(nameInput.value.trim() ? '' : 'Please enter your name.');
    if (!quickForm.reportValidity()) return;
    const data = new FormData(quickForm);
    const message = `Hello Time Cable Vision, I would like to enquire about ${data.get('service')}.\nName: ${String(data.get('name')).trim()}\nMobile: ${String(data.get('phone')).trim()}\nPlease help me explore my options.`;
    const link = document.querySelector('#quick-link');
    link.href = 'https://wa.me/919962543540?text=' + encodeURIComponent(message);
    link.hidden = false;
    document.querySelector('#quick-status').textContent = 'Your enquiry is ready. Open WhatsApp, review your message and tap Send.';
    link.focus();
  });
}
