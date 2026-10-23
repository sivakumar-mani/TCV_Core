const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../controller/catvCustomerPackageReport.js'), 'utf8');
async function run(query = {}, fail = false) {
  const calls = [];
  const db = { query: async (sql, args) => {
    calls.push({ sql, args });
    if (fail) throw new Error('private database error');
    if (sql.includes('FROM cable_tv_customers')) return [[
      { cable_customer_id: 1, package_price: '99.25' },
      { cable_customer_id: 1, package_price: '120.00' },
      { cable_customer_id: 2, package_price: null }
    ]];
    return [[]];
  } };
  const context = { require: () => ({ promise: () => db }), module: { exports: {} } };
  vm.runInNewContext(source, context);
  const res = { code: 200, status(code) { this.code = code; return this; }, json(body) { this.body = body; return this; } };
  await context.module.exports.getCatvCustomerPackageReport({ query }, res);
  return { calls, res };
}
test('report preserves customer prices and includes unassigned customers without multiplying STBs', async () => {
  const { calls, res } = await run();
  assert.equal(res.code, 200);
  assert.equal(res.body.total_records, 3);
  assert.equal(res.body.total_customers, 2);
  assert.equal(res.body.rows[0].package_price, '99.25');
  const sql = calls[0].sql;
  assert.match(sql, /LEFT JOIN cable_customer_packages/);
  assert.match(sql, /cp.approval_status = 'APPROVED' AND cp.is_active = 1/);
  assert.match(sql, /ORDER BY s.customer_stb_id DESC LIMIT 1/);
  assert.match(sql, /c.approval_status = 'APPROVED'/);
  assert.doesNotMatch(sql, /p.price|ROUND|SUM/);
  assert(calls.every(call => call.sql.startsWith('SELECT')));
});
test('network, package and customer status filters are parameterized and optional', async () => {
  const result = await run({ network_id: '2', package_id: '8', status: 'inactive' });
  assert.equal(result.res.code, 200);
  assert.deepEqual(Array.from(result.calls[0].args), [2, 8, 'INACTIVE']);
  assert.match(result.calls[0].sql, /c.network_id = \?.*cp.package_id = \?.*UPPER\(c.status\) = \?/s);
  assert.equal((await run({ network_id: '', package_id: null, status: '' })).res.code, 200);
  for (const query of [{ network_id: '-1' }, { package_id: '1 OR 1=1' }, { status: 'bad' }]) {
    const invalid = await run(query);
    assert.equal(invalid.res.code, 400);
    assert.equal(invalid.calls.length, 0);
  }
});
test('database failures return a useful error without exposing internals', async () => {
  const { res } = await run({}, true);
  assert.equal(res.code, 500);
  assert.doesNotMatch(JSON.stringify(res.body), /private/);
});
test('new report uses existing permission and leaves the existing report route available', () => {
  const router = fs.readFileSync(path.join(__dirname, '../routes/cableTvRouter.js'), 'utf8');
  assert(router.includes("router.get('/reports/customer-packages', auth.requirePermission('CATV_CUSTOMER_LIST_REPORT'), getCatvCustomerPackageReport)"));
  assert(router.includes("router.get('/reports/customers', auth.requirePermission('CATV_CUSTOMER_LIST_REPORT'), getCableCustomerListReport)"));
});
test('Excel and PDF export every row across pages and escape customer text', async () => {
  const ts = require('../../frontend/node_modules/typescript');
  const component = fs.readFileSync(path.join(__dirname, '../../frontend/src/app/administration/catv-customer-package-report/catv-customer-package-report.ts'), 'utf8');
  let blob, printHtml, downloaded;
  const workbookContext = { exports: {}, TextEncoder };
  const workbookSource = fs.readFileSync(path.join(__dirname, '../../frontend/src/app/shared/excel-workbook.ts'), 'utf8');
  vm.runInNewContext(ts.transpileModule(workbookSource, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, workbookContext);
  const context = { exports: {}, Blob, URL: { createObjectURL(value) { blob = value; return 'blob:test'; }, revokeObjectURL() {} },
    document: { createElement() { return { click() { downloaded = this.download; } }; } },
    window: { open: () => ({ document: { close() {} } }) },
    require(name) {
      if (name.includes('excel-workbook')) return workbookContext.exports;
      if (name.includes('print-layout')) return { writePrintDocument(popup, html) { printHtml = html; } };
      return { Component: () => target => target };
    }
  };
  vm.runInNewContext(ts.transpileModule(component, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, experimentalDecorators: true } }).outputText, context);
  const report = new context.exports.CatvCustomerPackageReport({}, {});
  report.rows = Array.from({ length: 125 }, (_, i) => ({ customer_code: `00${i}`, full_name: '<Customer & Name>', stb_no: '0012345', package_name: '=Test', package_price: '99.25', status: 'ACTIVE' }));
  report.totalCustomers = 125;
  report.exportExcel();
  const archive = Buffer.from(await blob.arrayBuffer());
  assert.equal(archive.readUInt32LE(0), 0x04034b50);
  const files = new Map();
  let offset = 0;
  while (archive.readUInt32LE(offset) === 0x04034b50) {
    assert.equal(archive.readUInt16LE(offset + 8), 0);
    const size = archive.readUInt32LE(offset + 18), nameLength = archive.readUInt16LE(offset + 26);
    const start = offset + 30 + nameLength;
    files.set(archive.subarray(offset + 30, start).toString(), archive.subarray(start, start + size).toString());
    offset = start + size;
  }
  assert.equal(files.size, 5);
  assert.equal(archive.readUInt32LE(offset), 0x02014b50);
  assert.equal(archive.readUInt32LE(archive.length - 22), 0x06054b50);
  assert.equal(downloaded, 'CATV_Customer_Packages.xlsx');
  const xml = files.get('xl/worksheets/sheet1.xml');
  assert.equal((xml.match(/<row r=/g) || []).length, 128);
  assert.match(xml, /t="inlineStr"><is><t xml:space="preserve">0012345/);
  assert.match(xml, /&lt;Customer &amp; Name&gt;/);
  assert.match(xml, /t="inlineStr"><is><t xml:space="preserve">=Test/);
  assert.match(xml, /<c r="F4"><v>99.25<\/v><\/c>/);
  assert.doesNotMatch(xml, /<f>/);
  report.exportPdf();
  assert.equal((printHtml.match(/<td>0012345<\/td>/g) || []).length, 125);
  assert.match(printHtml, /&lt;Customer &amp; Name&gt;/);
  assert.match(printHtml, /window.print/);
});
