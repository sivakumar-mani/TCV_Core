import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
const source = fs.readFileSync(new URL('../src/app/cable-tv/cable-tv-complaints/cable-tv-complaints.ts', import.meta.url), 'utf8');

function fixture(canView = true, admin = false) {
  const calls = [];
  const ctx = { confirm: () => true };
  vm.createContext(ctx);
  vm.runInContext(ts.transpile(source.slice(source.indexOf('export class CableTvComplaints')).replace('export class', 'class') + '\nthis.Page = CableTvComplaints;', { target: ts.ScriptTarget.ES2022 }), ctx);
  const service = { sendComplaintWhatsApp: id => { calls.push(['whatsapp', id]); return { subscribe: observer => observer.next({ message: 'Sent' }) }; }, completeComplaint: id => { calls.push(id); return { subscribe: observer => observer.next({ message: 'Completed' }) }; },
    deleteComplaint: () => { calls.push('delete'); return { subscribe: observer => observer.next({}) }; } };
  const page = new ctx.Page(service, { start() {}, stop() {} }, { openSnackbar() {} }, {}, { can: (_key, action) => action === 'view' && canView, isAdmin: () => admin });
  page.search = () => calls.push('refresh');
  return { page, calls };
}
test('Done completes once and refreshes the list', () => {
  const f = fixture();
  f.page.completeComplaint({ complaint_id: 7, complaint_no: 'CMP-7', status: 'OPEN' });
  assert.deepEqual(f.calls, [7, 'refresh']);
  assert.equal(f.page.completingId, null);
});
test('users without complaint access, completed rows and pending requests cannot complete', () => {
  const f = fixture(false);
  f.page.completeComplaint({ complaint_id: 7, status: 'OPEN' });
  assert.deepEqual(f.calls, []);
  const g = fixture();
  g.page.completeComplaint({ complaint_id: 7, status: 'COMPLETED' });
  g.page.completingId = 8;
  g.page.completeComplaint({ complaint_id: 7, status: 'OPEN' });
  assert.deepEqual(g.calls, []);
});
test('non-admin cannot delete and legacy statuses count as open', () => {
  const f = fixture();
  f.page.deleteComplaint({ complaint_id: 7 });
  assert.deepEqual(f.calls, []);
  f.page.summaryComplaints = ['OPEN','IN_PROGRESS','PENDING','HOLD','COMPLETED'].map(status => ({ status }));
  assert.equal(f.page.statusCount('OPEN'), 4);
  assert.equal(f.page.statusCount('COMPLETED'), 1);
  assert.equal(f.page.statusLabel('HOLD'), 'Open');
  assert.deepEqual(Array.from(f.page.statuses), ['OPEN', 'COMPLETED']);
});

test('staff with viewing access can send WhatsApp manually without update or admin access', () => {
  const f = fixture();
  f.page.sendWhatsApp({ complaint_id: 7, complainant_type: 'ANONYMOUS' });
  assert.deepEqual(f.calls, [['whatsapp', 7]]);
  assert.equal(f.page.sendingWhatsAppId, null);
});

test('WhatsApp send rejects missing viewing access and concurrent requests', () => {
  const f = fixture(false);
  f.page.sendWhatsApp({ complaint_id: 7 });
  assert.deepEqual(f.calls, []);
  const g = fixture();
  g.page.sendingWhatsAppId = 8;
  g.page.sendWhatsApp({ complaint_id: 7 });
  assert.deepEqual(g.calls, []);
});
