import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFile } from 'node:fs/promises';

const require = createRequire(import.meta.url);
const { evaluateEntryMonitor } = require('../lib/rebalancing/entry-monitor.js');

const base = {
  ticker:'MSFT',
  return1d:0,
  return5d:0,
  return20d:0,
  return60d:0,
  volatility20d:0.02,
  gapPct:0,
  volumeRatio:1,
  volumeState:'COMPLETE',
  eventState:'NONE',
  thesisValid:true
};

test('classifies a meaningful correction as PULLBACK without authorizing a trade', () => {
  const result = evaluateEntryMonitor({ ...base, return5d:-0.08 });
  assert.equal(result.state, 'PULLBACK');
  assert.match(result.reason, /correction/i);
});

test('classifies an accelerated move as SPIKE before EXTENDED', () => {
  const result = evaluateEntryMonitor({ ...base, return1d:0.09, return5d:0.16 });
  assert.equal(result.state, 'SPIKE');
});

test('gives thesis review precedence over market timing', () => {
  const result = evaluateEntryMonitor({ ...base, thesisValid:false, return5d:-0.15 });
  assert.equal(result.state, 'THESIS_EVENT');
});

test('keeps normal market behavior neutral', () => {
  const result = evaluateEntryMonitor(base);
  assert.equal(result.state, 'NORMAL');
});

test('integrates price-only signals directly in the Radar decision card', async () => {
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  assert.match(html, /NCI Radar Market Timing/);
  assert.match(html, /Market Timing · PRICE ONLY/);
  assert.match(html, /decisionAuthorization!==false/);
  assert.match(html, /Decisão humana obrigatória/);
  assert.match(html, /refreshMarketSignals\(\)/);
});
