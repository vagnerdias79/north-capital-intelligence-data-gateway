import test from 'node:test';
import assert from 'node:assert/strict';
import {
  assessTaxProductionReadiness,
  rehearseTaxCalculationCutover,
  selectTaxCalculationSource
} from '../lib/tax-calculation-source.js';

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

test('rehearses normalized cutover and restores legacy in preview', () => {
  const result = rehearseTaxCalculationCutover(rows(), {
    environment:'preview'
  });

  assert.equal(result.cutoverReady, true);
  assert.equal(result.candidate.activeSource, 'NORMALIZED_SINGLE_TAX_CASH_EFFECT');
  assert.equal(result.candidate.dashboardCalculationChanged, true);
  assert.equal(result.rollback.activeSource, 'LEGACY_METADATA_RAW_VALUE');
  assert.equal(result.rollback.restored, true);
  assert.equal(result.productionCalculationChanged, false);
  assert.equal(result.writeOperationsEnabled, false);
});

test('blocks cutover rehearsal outside preview', () => {
  const result = rehearseTaxCalculationCutover(rows(), {
    environment:'production'
  });

  assert.equal(result.cutoverReady, false);
  assert.equal(result.candidate.activeSource, 'LEGACY_METADATA_RAW_VALUE');
  assert.equal(result.rollback.activeSource, 'LEGACY_METADATA_RAW_VALUE');
  assert.equal(result.productionCalculationChanged, false);
});

test('fails closed when cutover candidate diverges', () => {
  const divergentRows = rows();
  divergentRows[0].metadata.raw.value = -0.12;
  const result = rehearseTaxCalculationCutover(divergentRows, {
    environment:'preview'
  });

  assert.equal(result.cutoverReady, false);
  assert.equal(result.candidate.eligible, false);
  assert.equal(result.candidate.activeSource, 'LEGACY_METADATA_RAW_VALUE');
  assert.equal(result.rollback.restored, true);
});

test('returns GO while keeping production promotion unauthorized', () => {
  const result = assessTaxProductionReadiness(rows(), {
    environment:'preview'
  });

  assert.equal(result.decision, 'GO_AWAITING_MANUAL_APPROVAL');
  assert.equal(result.ready, true);
  assert.equal(result.manualApprovalRequired, true);
  assert.equal(result.productionPromotionAuthorized, false);
  assert.equal(result.rollbackVerified, true);
  assert.equal(result.productionCalculationChanged, false);
  assert.equal(result.writeOperationsEnabled, false);
});

test('returns NO_GO outside preview', () => {
  const result = assessTaxProductionReadiness(rows(), {
    environment:'production'
  });

  assert.equal(result.decision, 'NO_GO');
  assert.equal(result.ready, false);
  assert.equal(result.productionPromotionAuthorized, false);
});

test('returns NO_GO when candidate equivalence is lost', () => {
  const divergentRows = rows();
  divergentRows[0].metadata.raw.value = -0.12;
  const result = assessTaxProductionReadiness(divergentRows, {
    environment:'preview'
  });

  assert.equal(result.decision, 'NO_GO');
  assert.equal(result.ready, false);
  assert.equal(result.divergences.length, 1);
  assert.equal(result.productionPromotionAuthorized, false);
});
