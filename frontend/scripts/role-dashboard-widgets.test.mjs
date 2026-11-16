import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
const source = fs.readFileSync(new URL('../src/app/administration/role-permissions/role-permissions.ts', import.meta.url), 'utf8');
function fixture(catalog, permissions = []) {
  const ctx = {};
  vm.createContext(ctx);
  vm.runInContext(ts.transpile(source.slice(source.indexOf('export class RolePermissions')).replace('export class', 'class') + '\nthis.Page = RolePermissions;', { target: ts.ScriptTarget.ES2022 }), ctx);
  const page = new ctx.Page({ getRolePermissions: () => ({ subscribe: cb => cb.next({ roles: ['EMPLOYEE'], catalog, permissions }) }) }, {});
  page.load();
  return page;
}
const dashboard = { group: 'General', key: 'DASHBOARD', label: 'Dashboard', route: '/dashboard' };
test('older catalog still displays all eight widget controls with an explicit backend warning', () => {
  const page = fixture([dashboard]);
  assert.equal(page.screens('Dashboard Widgets').length, 8);
  assert.equal(page.widgetCatalogMissing, true);
  assert.deepEqual(Array.from(page.groups()).slice(0, 2), ['General', 'Dashboard Widgets']);
  for (const item of page.screens('Dashboard Widgets')) assert.equal(page.matrix[item.key].can_view, false);
});
test('unsupported backend widget keys cannot be toggled or silently granted', () => {
  const page = fixture([dashboard]);
  const item = page.screens('Dashboard Widgets')[0];
  page.setAction(item, 'can_view', true);
  assert.equal(page.matrix[item.key].can_view, false);
});
test('updated backend enables individual view controls without enabling create/edit/delete', () => {
  const oldPage = fixture([dashboard]);
  const widgets = Array.from(oldPage.screens('Dashboard Widgets'));
  const page = fixture([dashboard, ...widgets]);
  assert.equal(page.widgetCatalogMissing, false);
  page.setAction(widgets[0], 'can_view', true);
  assert.equal(page.matrix[widgets[0].key].can_view, true);
  assert.equal(page.matrix[widgets[1].key].can_view, false);
  page.setAction(widgets[0], 'can_create', true);
  assert.equal(page.matrix[widgets[0].key].can_create, false);
});
test('existing screen permissions and existing widget grants are preserved', () => {
  const widget = fixture([dashboard]).screens('Dashboard Widgets')[0];
  const page = fixture([dashboard, widget], [
    { role: 'EMPLOYEE', permission_key: 'DASHBOARD', can_view: true },
    { role: 'EMPLOYEE', permission_key: widget.key, can_view: true }
  ]);
  assert.equal(page.matrix.DASHBOARD.can_view, true);
  assert.equal(page.matrix[widget.key].can_view, true);
  page.setAction(dashboard, 'can_create', true);
  assert.equal(page.matrix.DASHBOARD.can_create, true);
});
