import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
const source = fs.readFileSync(new URL('../src/app/dashboard/dashboard.ts', import.meta.url), 'utf8');
const methods = source.slice(source.indexOf('  get canViewExpiries()'), source.indexOf('  openReminderPreview('));
function fixture(grants = []) {
  const requests = [];
  const context = { appConfig: { apiUrl: '/api' } };
  vm.createContext(context);
  vm.runInContext(ts.transpile(`class Page { summary = {}; ${methods} } this.Page = Page;`, { target: ts.ScriptTarget.ES2022 }), context);
  const page = new context.Page();
  page.permissions = { can: key => grants.includes(key) };
  page.http = { get: (url, options) => { requests.push(options.params.type); return { subscribe: observer => observer.next({ current_month: 2 }) }; } };
  return { page, requests };
}
test('ungranted widgets stay hidden and do not request unpaid customer counts', () => {
  const f = fixture(['DASHBOARD']);
  assert.equal(f.page.canWidget('catv'), false);
  f.page.loadUnpaid();
  assert.deepEqual(f.requests, []);
});
test('each unpaid widget requests only its permitted service', () => {
  const f = fixture(['DASHBOARD_CATV_UNPAID']);
  f.page.loadUnpaid();
  assert.deepEqual(f.requests, ['CATV']);
  assert.equal(f.page.unpaid.NET, null);
});
test('server revocation hides a widget despite stale frontend grants', () => {
  const f = fixture(['DASHBOARD_CATV_UNPAID']);
  f.page.summary.widgets = { catvUnpaid: false };
  f.page.loadUnpaid();
  assert.equal(f.page.canWidget('catvUnpaid'), false);
  assert.deepEqual(f.requests, []);
});
test('expiry details need both widget access and existing customer view permission', () => {
  assert.equal(fixture(['DASHBOARD_INTERNET_EXPIRIES']).page.canViewExpiries, false);
  assert.equal(fixture(['INTERNET_CUSTOMERS']).page.canViewExpiries, false);
  assert.equal(fixture(['DASHBOARD_INTERNET_EXPIRIES', 'INTERNET_CUSTOMERS']).page.canViewExpiries, true);
});
