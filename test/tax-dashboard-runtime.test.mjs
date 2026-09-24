import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
const runtime = html.match(
  /<script type="module" id="nci-tax-dashboard-preview-v2-6-runtime">([\s\S]*?)<\/script>/
)?.[1] ?? '';

test('dashboard TAX runtime sends the Neon JWT as a Bearer token', () => {
  assert.match(runtime, /Authorization:`Bearer \$\{token\}`/);
});

test('dashboard TAX runtime accepts preview and production phases', () => {
  assert.match(runtime, /data\.phase==='2\.6'\|\|data\.phase==='2\.9'/);
});

test('dashboard TAX runtime recognizes normalized and legacy safe sources', () => {
  assert.match(runtime, /safeSource:normalized\|\|legacy/);
  assert.match(runtime, /const status=!pass\?'FAIL'/);
  assert.match(runtime, /'LEGACY_SAFE'/);
});

test('dashboard TAX runtime exposes automatic rollback instead of unavailable', () => {
  assert.match(runtime, /'AUTOMATIC_ROLLBACK'/);
  assert.match(runtime, /R?OLLBACK/);
  assert.match(runtime, /productionCalculationChanged:data\.productionCalculationChanged===true/);
});
