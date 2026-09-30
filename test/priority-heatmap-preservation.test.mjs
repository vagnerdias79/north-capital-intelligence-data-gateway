import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');

test('operational alerts never replace the monitored-priorities heatmap', () => {
  assert.match(html, /id="nativeRadarHeat"/);
  assert.match(html, /box\.style\.display = 'none';[\s\S]*const panel = document\.getElementById\('nativeRadarHeat'\)/);
  assert.match(html, /caption\.textContent = `Ranking dinâmico · \$\{relevant\.length\} sinal/);
});

test('keeps operational alert detail available without consuming panel height', () => {
  assert.match(html, /caption\.title = relevant\.map/);
  assert.match(html, /Sinal de preço não autoriza aporte/);
});
