import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeTaxCashEffect, simulateTaxPolicy } from '../lib/tax-cash-effect.js';

const amounts = [0.11, 0.18, 0.09, 0.03, 0.03, 0.03, 0.02, 0.02, 0.03];

test('normalizes original, baseline and legacy TAX representations to one debit', () => {
  const variants = [
    { transaction_type:'TAX', gross_amount:-0.11, tax_amount:0.11 },
    { transaction_type:'TAX', gross_amount:0, tax_amount:0.11 },
    { type:'TAX', value:-0.11 }
  ];

  for (const variant of variants) {
    const result = normalizeTaxCashEffect(variant);
    assert.equal(result.cashEffect, -0.11);
    assert.equal(result.singleDebit, true);
    assert.equal(result.writeOperationsEnabled, false);
  }
});

test('proves the nine homologated TAX events total exactly USD -0.54', () => {
  const rows = amounts.map((amount, index) => ({
    transaction_type:'TAX',
    external_ref:`ledger-${66 + index * 2}`,
    gross_amount:-amount,
    tax_amount:amount
  }));
  const result = simulateTaxPolicy(rows);

  assert.equal(result.eventCount, 9);
  assert.equal(result.totalCashEffect, -0.54);
  assert.equal(result.absoluteTotal, 0.54);
  assert.equal(result.noDoubleCounting, true);
  assert.equal(result.writeOperationsEnabled, false);
});

test('rejects conflicting amounts rather than silently double counting', () => {
  assert.throws(
    () => normalizeTaxCashEffect({ transaction_type:'TAX', gross_amount:-0.11, tax_amount:0.22 }),
    /AMBIGUOUS_TAX_REPRESENTATION/
  );
});

test('rejects non-TAX events and TAX events without an economic amount', () => {
  assert.throws(() => normalizeTaxCashEffect({ transaction_type:'DIVIDEND', gross_amount:0.11 }), /TAX_EVENT_REQUIRED/);
  assert.throws(() => normalizeTaxCashEffect({ transaction_type:'TAX', gross_amount:0, tax_amount:0 }), /TAX_AMOUNT_MISSING/);
});
