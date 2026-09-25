import test from 'node:test';
import assert from 'node:assert/strict';
import {
  assessTaxPostCutoverStability,
  assessTaxProductionReadiness,
  closeTaxMigration,
  monitorTaxPostCutoverHealth,
  rehearseTaxCalculationCutover,
  selectDashboardTaxSource,
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

test('activates normalized dashboard source in production only with explicit flag', () => {
  const result = selectDashboardTaxSource(rows(), {
    environment:'production',
    productionEnabled:true,
    integrityVerified:true
  });

  assert.equal(result.decision, 'NORMALIZED_ACTIVE');
  assert.equal(result.activeSource, 'NORMALIZED_SINGLE_TAX_CASH_EFFECT');
  assert.equal(result.productionEnabled, true);
  assert.equal(result.dashboardCalculationChanged, true);
  assert.equal(result.automaticRollback, false);
  assert.equal(result.writeOperationsEnabled, false);
});

test('keeps legacy dashboard source when production flag is disabled', () => {
  const result = selectDashboardTaxSource(rows(), {
    environment:'production',
    productionEnabled:false,
    integrityVerified:true
  });

  assert.equal(result.decision, 'LEGACY_ACTIVE');
  assert.equal(result.activeSource, 'LEGACY_METADATA_RAW_VALUE');
  assert.equal(result.dashboardCalculationChanged, false);
  assert.equal(result.automaticRollback, false);
});

test('rolls production back to legacy immediately when integrity is lost', () => {
  const divergentRows = rows();
  divergentRows[0].metadata.raw.value = -0.12;
  const result = selectDashboardTaxSource(divergentRows, {
    environment:'production',
    productionEnabled:true,
    integrityVerified:false
  });

  assert.equal(result.decision, 'AUTOMATIC_ROLLBACK_TO_LEGACY');
  assert.equal(result.activeSource, 'LEGACY_METADATA_RAW_VALUE');
  assert.equal(result.normalizedActive, false);
  assert.equal(result.automaticRollback, true);
  assert.equal(result.writeOperationsEnabled, false);
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

test('certifies stable production cutover and probes automatic rollback without mutation', () => {
  const result = assessTaxPostCutoverStability(rows(), {
    environment:'production',
    productionEnabled:true,
    integrityVerified:true
  });

  assert.equal(result.decision, 'STABLE');
  assert.equal(result.stable, true);
  assert.equal(result.active.activeSource, 'NORMALIZED_SINGLE_TAX_CASH_EFFECT');
  assert.equal(result.active.selectedTotal, -0.54);
  assert.equal(result.rollbackProbe.decision, 'AUTOMATIC_ROLLBACK_TO_LEGACY');
  assert.equal(result.rollbackProbe.activeSource, 'LEGACY_METADATA_RAW_VALUE');
  assert.equal(result.rollbackProbe.productionStateChanged, false);
  assert.equal(result.writeOperationsEnabled, false);
});

test('requires rollback when post-cutover integrity is not verified', () => {
  const result = assessTaxPostCutoverStability(rows(), {
    environment:'production',
    productionEnabled:true,
    integrityVerified:false
  });

  assert.equal(result.decision, 'ROLLBACK_REQUIRED');
  assert.equal(result.stable, false);
  assert.equal(result.active.activeSource, 'LEGACY_METADATA_RAW_VALUE');
  assert.equal(result.active.automaticRollback, true);
  assert.equal(result.writeOperationsEnabled, false);
});

test('reports healthy post-cutover monitoring signals without writes', () => {
  const result = monitorTaxPostCutoverHealth(rows(), {
    environment:'production',
    productionEnabled:true,
    integrityVerified:true
  });

  assert.equal(result.health, 'HEALTHY');
  assert.equal(result.healthy, true);
  assert.equal(result.signals.activeSource, 'NORMALIZED_SINGLE_TAX_CASH_EFFECT');
  assert.equal(result.signals.eventCount, 9);
  assert.equal(result.signals.selectedTotal, -0.54);
  assert.equal(result.signals.totalDifference, 0);
  assert.equal(result.signals.divergenceCount, 0);
  assert.equal(result.signals.rollbackAvailable, true);
  assert.equal(result.alert, null);
  assert.equal(result.writeOperationsEnabled, false);
});

test('raises rollback-required monitoring alert when integrity fails', () => {
  const result = monitorTaxPostCutoverHealth(rows(), {
    environment:'production',
    productionEnabled:true,
    integrityVerified:false
  });

  assert.equal(result.health, 'ROLLBACK_REQUIRED');
  assert.equal(result.healthy, false);
  assert.equal(result.signals.activeSource, 'LEGACY_METADATA_RAW_VALUE');
  assert.equal(result.alert.severity, 'CRITICAL');
  assert.equal(result.alert.action, 'ROLLBACK_TO_LEGACY');
  assert.equal(result.alert.rollbackSource, 'LEGACY_METADATA_RAW_VALUE');
  assert.equal(result.writeOperationsEnabled, false);
});

test('closes the TAX migration while retaining legacy contingency', () => {
  const result = closeTaxMigration(rows(), {
    environment:'production',
    productionEnabled:true,
    integrityVerified:true
  });

  assert.equal(result.decision, 'TAX_MIGRATION_CLOSED');
  assert.equal(result.migrationClosed, true);
  assert.equal(result.normalizedSource, 'NORMALIZED_SINGLE_TAX_CASH_EFFECT');
  assert.equal(result.rollbackSource, 'LEGACY_METADATA_RAW_VALUE');
  assert.equal(result.rollbackSourceRetained, true);
  assert.equal(result.operationalState, 'NORMALIZED_STABLE_WITH_LEGACY_CONTINGENCY');
  assert.equal(result.productionStateChanged, false);
  assert.equal(result.writeOperationsEnabled, false);
});

test('blocks TAX migration closure when monitoring is unhealthy', () => {
  const result = closeTaxMigration(rows(), {
    environment:'production',
    productionEnabled:true,
    integrityVerified:false
  });

  assert.equal(result.decision, 'CLOSURE_BLOCKED');
  assert.equal(result.migrationClosed, false);
  assert.equal(result.operationalState, 'REVIEW_REQUIRED');
  assert.equal(result.writeOperationsEnabled, false);
});
