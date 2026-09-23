import test from 'node:test';
import assert from 'node:assert/strict';
import { classifyLedgerRows, reconcile } from '../lib/ledger-reconciliation.js';

function row(id, index, overrides = {}) {
  return {
    id,
    transaction_type: index % 2 ? 'BUY' : 'DIVIDEND',
    trade_date: `2026-08-${String((index % 28) + 1).padStart(2, '0')}`,
    settlement_date: null,
    ticker: `T${index}`,
    quantity: index % 2 ? '1.25' : null,
    unit_price: index % 2 ? '10.00' : null,
    gross_amount: String(index + 1),
    fee_amount: '0',
    tax_amount: '0',
    currency: 'USD',
    fx_rate: null,
    external_ref: `REF-${index}`,
    source: 'TEST',
    notes: null,
    ...overrides
  };
}

test('reconciles 85 original/baseline pairs and reports nine divergences', () => {
  const originals = Array.from({ length: 85 }, (_, index) => row(`o-${index}`, index));
  const baselines = originals.map((original, index) => row(`b-${index}`, index, {
    gross_amount: index < 9 ? String(Number(original.gross_amount) + 0.01) : original.gross_amount
  }));

  const result = reconcile(originals, baselines);
  assert.equal(result.pairs.length, 85);
  assert.equal(result.pairs.filter(pair => pair.status === 'DIVERGENT').length, 9);
  assert.deepEqual(result.unmatchedOriginals, []);
  assert.deepEqual(result.unmatchedBaselines, []);
});

test('pairs duplicate natural keys deterministically by input order', () => {
  const originalA = row('o-a', 1, { ticker:'VIST', trade_date:'2026-06-22', gross_amount:'8.66' });
  const originalB = row('o-b', 1, { ticker:'VIST', trade_date:'2026-06-22', gross_amount:'11.53' });
  const baselineA = row('b-a', 1, { ticker:'VIST', trade_date:'2026-06-22', gross_amount:'8.66' });
  const baselineB = row('b-b', 1, { ticker:'VIST', trade_date:'2026-06-22', gross_amount:'11.53' });

  const result = reconcile([originalA, originalB], [baselineA, baselineB]);
  assert.deepEqual(result.pairs.map(pair => pair.status), ['MATCH', 'MATCH']);
});


test('classifies only migration-linked rows as baselines when all rows share the fingerprint', () => {
  const fingerprint = 'NCI-LEDGER-AEF25E9D3A64';
  const original = row('o-1', 1, {
    ledger_fingerprint: fingerprint,
    metadata: { ledgerFingerprint:fingerprint, baseline:'NCI USD 1.1.02' }
  });
  const baseline = row('b-1', 1, {
    ledger_fingerprint: fingerprint,
    metadata: {
      ledgerFingerprint:fingerprint,
      baseline:'NCI USD 1.1.02',
      originalTransactionType:'BUY',
      sourceIndex:0,
      sourceLedgerId:'ledger-1',
      sourceLedgerType:'BUY'
    }
  });

  const result = classifyLedgerRows([original, baseline], fingerprint);
  assert.deepEqual(result.originals.map(item => item.id), ['o-1']);
  assert.deepEqual(result.baselines.map(item => item.id), ['b-1']);
});
