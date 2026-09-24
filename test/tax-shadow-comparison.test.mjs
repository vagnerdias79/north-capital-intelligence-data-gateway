import test from 'node:test';
import assert from 'node:assert/strict';
import { compareTaxShadowRows } from '../lib/tax-shadow-comparison.js';

const amounts = [0.11, 0.18, 0.09, 0.03, 0.03, 0.03, 0.02, 0.02, 0.03];

function rowsWithLegacy(overrides = {}) {
  return amounts.map((amount, index) => ({
    transaction_type:'TAX',
    external_ref:`ledger-${66 + index * 2}`,
    ticker:`T${index + 1}`,
    gross_amount:-amount,
    tax_amount:amount,
    metadata:{raw:{value:-amount}},
    ...overrides
  }));
}

test('proves normalized and legacy TAX cash effects are equivalent', () => {
  const result = compareTaxShadowRows(rowsWithLegacy());

  assert.equal(result.eventCount, 9);
  assert.equal(result.normalizedTotal, -0.54);
  assert.equal(result.legacyTotal, -0.54);
  assert.equal(result.totalDifference, 0);
  assert.equal(result.equivalent, true);
  assert.equal(result.divergences.length, 0);
  assert.equal(result.writeOperationsEnabled, false);
});

test('reports a legacy divergence instead of masking it', () => {
  const rows = rowsWithLegacy();
  rows[0].metadata.raw.value = -0.12;
  const result = compareTaxShadowRows(rows);

  assert.equal(result.equivalent, false);
  assert.equal(result.divergences.length, 1);
  assert.equal(result.divergences[0].reference, 'ledger-66');
  assert.equal(result.divergences[0].difference, 0.01);
});

test('fails closed when the legacy value is missing', () => {
  const rows = rowsWithLegacy();
  delete rows[0].metadata.raw.value;
  assert.throws(() => compareTaxShadowRows(rows), /TAX_AMOUNT_MISSING/);
});
