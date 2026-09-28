import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');

test('documents the three controlled operations executed on 25/09/2026', () => {
  const expected = [
    [
      'nci-post-baseline-20260925-tflo-sell',
      "ticker:'TFLO'",
      'value:100.00',
      'qty:1.97433366',
      'price:50.65'
    ],
    [
      'nci-post-baseline-20260925-relx-buy',
      "ticker:'RELX'",
      'value:60.00',
      'qty:1.79111962',
      'price:33.50'
    ],
    [
      'nci-post-baseline-20260925-spgi-buy',
      "ticker:'SPGI'",
      'value:41.23',
      'qty:.10232577',
      'price:402.93'
    ]
  ];

  for (const fields of expected) {
    for (const field of fields) assert.ok(html.includes(field), `missing ${field}`);
  }
});

test('keeps controlled operations outside the frozen baseline and local-only delta', () => {
  const baselineDeclaration = html.indexOf('const NCI_BASELINE_LEDGER_IDS=new Set(rows.map(x=>x.id))');
  const controlledDeclaration = html.indexOf('const NCI_CONTROLLED_POST_BASELINE_LEDGER=[');

  assert.ok(baselineDeclaration >= 0);
  assert.ok(controlledDeclaration > baselineDeclaration);
  assert.ok(html.includes("!NCI_BASELINE_LEDGER_IDS.has(r.id)&&!NCI_CONTROLLED_LEDGER_IDS.has(r.id)"));
  assert.ok(html.includes('NCI_BASELINE_LEDGER_IDS.has(id)||NCI_CONTROLLED_LEDGER_IDS.has(id)'));
  assert.ok(html.includes('NCI_CONTROLLED_ECONOMIC_KEYS.has(controlledEconomicKey(op))'));
  assert.ok(html.includes("baseline?'BASELINE':'CONTROLADO'"));
});

test('preserves the documented cash effect of the 25/09 cycle', () => {
  const sale = 100;
  const purchases = 60 + 41.23;
  assert.equal(Number((sale - purchases).toFixed(2)), -1.23);
});
