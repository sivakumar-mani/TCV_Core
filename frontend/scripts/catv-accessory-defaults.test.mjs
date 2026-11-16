import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const source = fs.readFileSync(new URL('../src/app/cable-tv/cable-tv-customer-form/cable-tv-customer-form.ts', import.meta.url), 'utf8');
const methods = source.slice(source.indexOf('  buildStbAccessoryRows('), source.indexOf('  accessoryDisplayName('));
const context = {};
vm.createContext(context);
vm.runInContext(ts.transpile(`class Form { ${methods} } this.Form = Form;`, { target: ts.ScriptTarget.ES2022 }), context);
const products = [
  [1, 'Asian Adaptor 12v 2amps', 3], [2, 'Asian AAA Battery', 26],
  [3, 'Asian Adaptor 12V 1amp', 0], [4, 'Asian HDMI 1m', 0],
  [5, 'Asian Remote VK Blue', 0], [6, 'DM Adaptor 12V 1amp', 78],
  [7, 'DM HDMI 1m', 99], [8, 'DM Remote DM Original', 94]
].map(([product_id, product_name, available_qty]) => ({ product_id, product_name, available_qty }));

function form(items = products, edit = false, fallback = false) {
  const f = new context.Form();
  f.isEditMode = edit;
  f.lookups = fallback ? { products: items } : { stbAccessories: items };
  f.stbAccessories = { controls: [], clear() { this.controls = []; }, push(row) { this.controls.push(row); } };
  f.fb = { group: values => ({ get: key => ({ value: values[key][0] }) }) };
  return f;
}

test('new connection defaults select available DM alternatives and battery', () => {
  const f = form();
  f.buildStbAccessoryRows();
  const selected = f.stbAccessories.controls.filter(row => row.get('selected').value).map(row => row.get('product_id').value);
  assert.deepEqual(selected, [2, 6, 7, 8]);
  assert(!f.stbAccessories.controls.some(row => row.get('product_id').value === 1));
});

test('no category stock means no automatic selection', () => {
  const f = form(products.map(p => ({ ...p, available_qty: 0 })));
  f.buildStbAccessoryRows();
  assert(!f.stbAccessories.controls.some(row => row.get('selected').value));
});

test('saved edit selections survive zero stock and retain historical 2A accessory', () => {
  const f = form(products, true);
  f.buildStbAccessoryRows([{ product_id: 1, qty: 1 }, { product_id: 3, qty: 1 }]);
  assert.deepEqual(f.stbAccessories.controls.filter(row => row.get('selected').value).map(row => row.get('product_id').value), [1, 3]);
});

test('fallback lookup also excludes 2A adapters while preserving 1A adapters', () => {
  const f = form(products, false, true);
  const ids = Array.from(f.stbAccessoryProducts(), p => p.product_id);
  assert(!ids.includes(1));
  assert(ids.includes(3));
  assert(ids.includes(6));
});
