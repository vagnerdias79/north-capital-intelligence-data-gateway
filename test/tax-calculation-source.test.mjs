import test from 'node:test';
import assert from 'node:assert/strict';
import { selectTaxCalculationSource } from '../lib/tax-calculation-source.js';

const amounts = [0.11, 0.18, 0.09, 0.03, 0.03, 0.03, 0.02, 0.02, 0.03];

function rows() {
  return amounts.map((amount, index) => ({
    transaction_type:'TAX',
    external_ref:`ledger-${66 + index * 2}`,
    ticker:`T${index + 1}`,
    gross_amount:-amount,
    tax_amount:amount,
    metadata:{raw:{value:-amount}}
  }));
}

test('activates normalized TAX source only in preview when equivalent', () => {
  const result = selectTaxCalculationSource(rows(), {
    requestedSource:'normalized',
    environment:'preview'
  });

  assert.equal(result.normalizedActive, true);
  assert.equal(result.activeSource, 'NORMALIZED_SINGLE_TAX_CASH_EFFECT');
  assert.equal(result.selectedTotal, -0.54);
  assert.equal(result.totalDifference, 0);
  assert.equal(result.dashboardCalculationChanged, false);
  assert.equal(result.writeOperationsEnabled, false);
});

test('keeps legacy source outside preview', () => {
  const result = selectTaxCalculationSource(rows(), {
    requestedSource:'normalized',
    environment:'production'
  });

  assert.equal(result.normalizedActive, false);
  assert.equal(result.activeSource, 'LEGACY_METADATA_RAW_VALUE');
  assert.equal(result.rollbackSource, 'LEGACY_METADATA_RAW_VALUE');
});

test('exposes normalized TAX to the dashboard only for the preview consumer', () => {
  const result = selectTaxCalculationSource(rows(), {
    requestedSource:'normalized',
    environment:'preview',
    dashboardConsumer:true
  });

  assert.equal(result.normalizedActive, true);
  assert.equal(result.dashboardCalculationChanged, true);
  assert.equal(result.selectedTotal, -0.54);
  assert.equal(result.writeOperationsEnabled, false);
});

test('never changes the dashboard calculation in production', () => {
  const result = selectTaxCalculationSource(rows(), {
    requestedSource:'normalized',
    environment:'production',
    dashboardConsumer:true
  });

  assert.equal(result.normalizedActive, false);
  assert.equal(result.dashboardCalculationChanged, false);
  assert.equal(result.activeSource, 'LEGACY_METADATA_RAW_VALUE');
});

test('fails closed to legacy when shadow equivalence is lost', () => {
  const divergentRows = rows();
  divergentRows[0].metadata.raw.value = -0.12;
  const result = selectTaxCalculationSource(divergentRows, {
    requestedSource:'normalized',
    environment:'preview'
  });

  assert.equal(result.eligible, false);
  assert.equal(result.normalizedActive, false);
  assert.equal(result.activeSource, 'LEGACY_METADATA_RAW_VALUE');
  assert.equal(result.divergences.length, 1);
});
