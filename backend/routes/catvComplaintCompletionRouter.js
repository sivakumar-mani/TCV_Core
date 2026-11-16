const express = require('express');
const crypto = require('node:crypto');
const { completionConfig, completionHandlers } = require('../services/catvComplaintCompletionLinks');

function createCompletionRouter(connection, env = process.env) {
  const router = express.Router();
  router.use((_req, res, next) => {
    res.set({ 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer', 'X-Content-Type-Options': 'nosniff', 'X-Robots-Tag': 'noindex, nofollow', 'X-Frame-Options': 'DENY' });
    next();
  });
  // GET only serves a confirmation page. It never reads or updates a complaint.
  router.get('/done', (_req, res) => {
    try { if (!completionConfig(env)) return res.status(404).send('Completion links are not enabled.'); }
    catch { return res.status(503).send('Complaint confirmation is temporarily unavailable.'); }
    const nonce = crypto.randomBytes(16).toString('hex');
    res.set('Content-Security-Policy', `default-src 'none'; script-src 'nonce-${nonce}'; style-src 'nonce-${nonce}'; connect-src 'self'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'`);
    res.type('html').send(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Complete CATV complaint</title>
      <style nonce="${nonce}">*{box-sizing:border-box}body{margin:0;padding:24px;background:#f2f5fa;color:#172b4d;font:16px Arial,sans-serif;min-height:100vh;display:grid;place-items:center}main{width:min(100%,440px);background:white;border-top:5px solid #175cd3;border-radius:16px;padding:28px;box-shadow:0 12px 40px #172b4d18}small{color:#667085}h1{font-size:24px}p{line-height:1.6}button{width:100%;padding:14px;border:0;border-radius:8px;background:#087443;color:white;font-size:16px;font-weight:bold;cursor:pointer}button:disabled{opacity:.5;cursor:default}</style></head>
      <body><main><small>TIME CABLE VISION</small><h1>Complete complaint</h1><p id="number"></p><p id="message" role="status">Checking your completion link…</p><button id="done" disabled>Confirm Done</button></main>
      <script nonce="${nonce}">
      const token = location.hash.slice(1);
      history.replaceState(null, '', location.pathname);
      const message = document.getElementById('message'), number = document.getElementById('number'), button = document.getElementById('done');
      async function request(action, body) {
        const response = await fetch(location.pathname + '/' + action, {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),credentials:'omit',cache:'no-store'});
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || 'This link is unavailable.');
        return data;
      }
      if (!/^[a-f0-9]{64}$/.test(token)) message.textContent = 'This link is incomplete or invalid. Open the full link from the WhatsApp complaint message.';
      else request('preview', {token}).then(data => {
        number.textContent = 'Complaint ' + data.complaint_no;
        message.textContent = data.completed ? 'This complaint is already complete.' : 'Has this complaint been resolved? Press Confirm Done to mark it complete in the portal.';
        button.disabled = data.completed;
      }).catch(error => {message.textContent = error.message;});
      button.addEventListener('click', async () => {
        button.disabled = true;
        message.textContent = 'Saving completion…';
        try { const data = await request('confirm', {token,confirm:true}); message.textContent = data.message; button.textContent = 'Completed'; }
        catch(error) { message.textContent = error.message + ' Reopen the original WhatsApp link to check the status.'; }
      });
      </script></body></html>`);
  });
  const handlers = completionHandlers(connection, env);
  router.post('/done/preview', handlers.preview);
  router.post('/done/confirm', handlers.confirm);
  return router;
}

module.exports = { createCompletionRouter };
