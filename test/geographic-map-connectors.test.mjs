import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');

test('keeps the homologated regional connector routes in the geographic map', () => {
  for (const route of ['c-us-global', 'c-lat-global', 'c-eu-global', 'c-asia-global', 'c-oce-global']) {
    assert.match(html, new RegExp(`['\"]${route}['\"]`));
  }
  assert.match(html, /scheduleRegionalConnectors\(\)/);
});

test('redraws geographic connectors after layout stabilization and resizing', () => {
  assert.match(html, /setTimeout\(redraw,80\)/);
  assert.match(html, /setTimeout\(redraw,260\)/);
  assert.match(html, /new ResizeObserver\(redraw\)/);
  assert.match(html, /observer\.observe\(panel\)/);
});
