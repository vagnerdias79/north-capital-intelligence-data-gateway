import test from 'node:test';
import assert from 'node:assert/strict';
import { analyzeTaxRows } from '../lib/tax-divergence-analysis.js';

const fingerprint = 'NCI-LEDGER-AEF25E9D3A64';

function tax(id, externalRef, grossAmount, overrides = {}) {
  return {
    id,
    transaction_type:'TAX',
    trade_date:'2026-06-23',
    ticker:'VXUS',
    gross_amount:grossAmount,
    tax_amount:0,
    fee_amount:0,
    external_ref:externalRef,
    ledger_fingerprint:fingerprint,
    ...overrides
  };
}

test('pairs TAX rows by canonical reference and quantifies value-placement difference', () => {
  const result = analyzeTaxRows([
    tax('o-1', 'ledger-66', 0),
    tax('b-1', 'NCI-BASELINE:ledger-66', -0.11)
  ], fingerprint);

  assert.equal(result.originals, 1);
  assert.equal(result.baselines, 1);
  assert.equal(result.pairs.length, 1);
  assert.equal(result.pairs[0].classification, 'VALUE_PLACEMENT_REVIEW');
  assert.equal(result.absoluteGrossDifference, 0.11);
  assert.deepEqual(result.unmatchedOriginals, []);
  assert.deepEqual(result.unmatchedBaselines, []);
});

test('ignores non-TAX rows and rows outside the official fingerprint', () => {
  const result = analyzeTaxRows([
    tax('buy-1', 'ledger-1', 10, { transaction_type:'BUY' }),
    tax('tax-foreign', 'ledger-2', 0, { ledger_fingerprint:'OTHER' })
  ], fingerprint);

  assert.equal(result.originals, 0);
  assert.equal(result.baselines, 0);
  assert.equal(result.pairs.length, 0);
});
