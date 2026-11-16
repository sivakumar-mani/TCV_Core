import '@angular/compiler';
import { formatDate } from '@angular/common';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const compile = text => ts.transpileModule(text, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, experimentalDecorators: true } }).outputText;
const context = { exports: {} };
vm.runInNewContext(compile(fs.readFileSync(new URL('../src/app/shared/india-date.ts', import.meta.url), 'utf8')), context);
const { formatIndianDate: date, formatIndianDateTime: dateTime } = context.exports;
const pipeContext = { exports: {}, require: name => {
  if (name === '@angular/common') return { formatDate };
  if (name === '@angular/core') return { Pipe: () => target => target };
  return context.exports;
} };
vm.runInNewContext(compile(fs.readFileSync(new URL('../src/app/shared/india-date.pipe.ts', import.meta.url), 'utf8')), pipeContext);
const pipe = new pipeContext.exports.IndiaDatePipe();

test('calendar dates remain dd-MM-yyyy without a device-timezone shift', () => {
  for (const input of ['2026-11-16', '2026-11-16T00:00:00', '2026-11-16 00:00:00']) {
    assert.equal(date(input), '16-11-2026');
    assert.equal(pipe.transform(input), '16-11-2026');
  }
});
test('UTC and offset timestamps display the correct India day, month and year', () => {
  assert.equal(date('2026-11-15T18:30:00.000Z'), '16-11-2026');
  assert.equal(date('2026-10-31T18:30:00Z'), '01-11-2026');
  assert.equal(date('2025-12-31T18:30:00Z'), '01-01-2026');
  assert.equal(date('2026-11-16T00:00:00+05:30'), '16-11-2026');
  assert.equal(pipe.transform('2026-11-15T18:30:00Z'), '16-11-2026');
});
test('null, invalid and ambiguous strings are not silently interpreted as another calendar date', () => {
  for (const input of [null, undefined, '', 'bad', '2026-02-29', '2026-04-31', '11/12/2026']) {
    assert.equal(date(input, '-'), '-');
    assert.equal(pipe.transform(input), null);
  }
  assert.equal(date('2024-02-29'), '29-02-2024');
});
test('timestamp displays retain time and all template formats use India time', () => {
  const input = '2026-11-15T18:30:00.000Z';
  assert.match(dateTime(input), /^16-11-2026, 12:00:00 am$/);
  assert.equal(pipe.transform(input, 'dd-MM-yyyy, h:mm a'), '16-11-2026, 12:00 AM');
  assert.equal(pipe.transform(input, 'mediumTime'), '12:00:00 AM');
});
test('display formatting does not mutate Date objects, API strings or edit payloads', () => {
  const start = new Date('2026-11-15T18:30:00.000Z'), before = start.getTime();
  assert.equal(date(start), '16-11-2026');
  assert.equal(start.getTime(), before);
  const payload = { start_date: '2026-11-16', end_date: '2026-12-15' };
  const json = JSON.stringify(payload);
  date(payload.start_date); pipe.transform(payload.end_date);
  assert.equal(JSON.stringify(payload), json);
  assert.equal(JSON.parse(json).start_date, '2026-11-16');
});
test('employee picker displays selected local calendar date and retains native parsing', () => {
  const adapterContext = { exports: {}, require: name => name === '@angular/core'
    ? { Injectable: () => target => target }
    : { NativeDateAdapter: class { format() { return 'month header'; } }, MAT_NATIVE_DATE_FORMATS: { display: {} } } };
  vm.runInNewContext(compile(fs.readFileSync(new URL('../src/app/shared/india-date-adapter.ts', import.meta.url), 'utf8')), adapterContext);
  const adapter = new adapterContext.exports.IndiaDateAdapter();
  const selected = new Date(2026, 10, 16);
  const before = selected.getTime();
  assert.equal(adapter.format(selected, 'dd-MM-yyyy'), '16-11-2026');
  assert.equal(adapter.format(selected, 'monthYearLabel'), 'month header');
  assert.equal(selected.getTime(), before);
});
