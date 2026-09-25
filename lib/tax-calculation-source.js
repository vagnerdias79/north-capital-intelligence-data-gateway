import { compareTaxShadowRows } from './tax-shadow-comparison.js';

const LEGACY_SOURCE = 'LEGACY_METADATA_RAW_VALUE';
const NORMALIZED_SOURCE = 'NORMALIZED_SINGLE_TAX_CASH_EFFECT';

export function selectTaxCalculationSource(rows, options = {}) {
  const requestedSource = String(options.requestedSource ?? 'legacy').toLowerCase();
  const environment = String(options.environment ?? '').toLowerCase();
  const normalizedRequested = requestedSource === 'normalized';
  const previewEnvironment = environment === 'preview';
  const productionEnvironment = environment === 'production';
  const productionEnabled = options.productionEnabled === true;
  const comparison = compareTaxShadowRows(rows);
  const eligible = comparison.equivalent === true && comparison.divergences.length === 0;
  const environmentAuthorized = previewEnvironment || (productionEnvironment && productionEnabled);
  const normalizedActive = normalizedRequested && environmentAuthorized && eligible;
  const dashboardConsumer = options.dashboardConsumer === true;

  return {
    requestedSource:normalizedRequested ? NORMALIZED_SOURCE : LEGACY_SOURCE,
    activeSource:normalizedActive ? NORMALIZED_SOURCE : LEGACY_SOURCE,
    normalizedActive,
    previewOnly:!productionEnvironment,
    previewEnvironment,
    productionEnvironment,
    productionEnabled,
    environmentAuthorized,
    eligible,
    eventCount:comparison.eventCount,
    selectedTotal:normalizedActive ? comparison.normalizedTotal : comparison.legacyTotal,
    normalizedTotal:comparison.normalizedTotal,
    legacyTotal:comparison.legacyTotal,
    totalDifference:comparison.totalDifference,
    equivalent:comparison.equivalent,
    divergences:comparison.divergences,
    rollbackSource:LEGACY_SOURCE,
    dashboardCalculationChanged:normalizedActive && dashboardConsumer,
    writeOperationsEnabled:false
  };
}

export function selectDashboardTaxSource(rows, options = {}) {
  const environment = String(options.environment ?? '').toLowerCase();
  const productionEnabled = options.productionEnabled === true;
  const integrityVerified = options.integrityVerified === true;
  const normalizedRequested = environment === 'preview' ||
    (environment === 'production' && productionEnabled && integrityVerified);
  const activation = selectTaxCalculationSource(rows, {
    requestedSource:normalizedRequested ? 'normalized' : 'legacy',
    environment,
    productionEnabled:productionEnabled && integrityVerified,
    dashboardConsumer:true
  });
  const automaticRollback =
    environment === 'production' &&
    productionEnabled &&
    activation.normalizedActive === false;

  return {
    ...activation,
    featureFlag:'TAX_NORMALIZED_PRODUCTION_ENABLED',
    integrityVerified,
    automaticRollback,
    decision:activation.normalizedActive
      ? 'NORMALIZED_ACTIVE'
      : automaticRollback
        ? 'AUTOMATIC_ROLLBACK_TO_LEGACY'
        : 'LEGACY_ACTIVE'
  };
}

export function assessTaxPostCutoverStability(rows, options = {}) {
  const environment = String(options.environment ?? '').toLowerCase();
  const productionEnabled = options.productionEnabled === true;
  const integrityVerified = options.integrityVerified === true;
  const active = selectDashboardTaxSource(rows, {
    environment,
    productionEnabled,
    integrityVerified
  });
  const rollbackProbe = selectDashboardTaxSource(rows, {
    environment,
    productionEnabled,
    integrityVerified:false
  });
  const stable =
    environment === 'production' &&
    productionEnabled &&
    integrityVerified &&
    active.decision === 'NORMALIZED_ACTIVE' &&
    active.activeSource === NORMALIZED_SOURCE &&
    active.equivalent === true &&
    active.divergences.length === 0 &&
    rollbackProbe.decision === 'AUTOMATIC_ROLLBACK_TO_LEGACY' &&
    rollbackProbe.activeSource === LEGACY_SOURCE &&
    rollbackProbe.writeOperationsEnabled === false;

  return {
    strategy:'POST_CUTOVER_STABILITY_GATE',
    decision:stable ? 'STABLE' : 'ROLLBACK_REQUIRED',
    stable,
    active,
    rollbackProbe:{
      simulated:true,
      productionStateChanged:false,
      decision:rollbackProbe.decision,
      activeSource:rollbackProbe.activeSource,
      automaticRollback:rollbackProbe.automaticRollback,
      writesBlocked:rollbackProbe.writeOperationsEnabled === false
    },
    writeOperationsEnabled:false
  };
}

export function monitorTaxPostCutoverHealth(rows, options = {}) {
  const stability = assessTaxPostCutoverStability(rows, options);
  const healthy =
    stability.stable === true &&
    stability.active.eventCount === 9 &&
    stability.active.selectedTotal === -0.54 &&
    stability.active.normalizedTotal === -0.54 &&
    stability.active.legacyTotal === -0.54 &&
    stability.active.totalDifference === 0 &&
    stability.active.divergences.length === 0 &&
    stability.active.writeOperationsEnabled === false &&
    stability.rollbackProbe.automaticRollback === true &&
    stability.rollbackProbe.productionStateChanged === false;

  return {
    strategy:'POST_CUTOVER_CONTINUOUS_HEALTH_MONITOR',
    health:healthy ? 'HEALTHY' : 'ROLLBACK_REQUIRED',
    healthy,
    signals:{
      activeSource:stability.active.activeSource,
      eventCount:stability.active.eventCount,
      selectedTotal:stability.active.selectedTotal,
      normalizedTotal:stability.active.normalizedTotal,
      legacyTotal:stability.active.legacyTotal,
      totalDifference:stability.active.totalDifference,
      divergenceCount:stability.active.divergences.length,
      integrityVerified:stability.active.integrityVerified,
      rollbackAvailable:stability.rollbackProbe.automaticRollback === true,
      productionStateChanged:false,
      writesBlocked:stability.writeOperationsEnabled === false
    },
    alert:healthy ? null : {
      severity:'CRITICAL',
      action:'ROLLBACK_TO_LEGACY',
      rollbackSource:LEGACY_SOURCE
    },
    stability,
    writeOperationsEnabled:false
  };
}

export function closeTaxMigration(rows, options = {}) {
  const monitoring = monitorTaxPostCutoverHealth(rows, options);
  const rollbackSourceRetained =
    monitoring.stability.active.rollbackSource === LEGACY_SOURCE &&
    monitoring.stability.rollbackProbe.activeSource === LEGACY_SOURCE;
  const migrationClosed =
    monitoring.health === 'HEALTHY' &&
    monitoring.healthy === true &&
    monitoring.alert === null &&
    rollbackSourceRetained &&
    monitoring.signals.productionStateChanged === false &&
    monitoring.signals.writesBlocked === true;

  return {
    strategy:'TAX_MIGRATION_TECHNICAL_CLOSURE',
    decision:migrationClosed ? 'TAX_MIGRATION_CLOSED' : 'CLOSURE_BLOCKED',
    migrationClosed,
    normalizedSource:monitoring.signals.activeSource,
    rollbackSource:LEGACY_SOURCE,
    rollbackSourceRetained,
    operationalState:migrationClosed ? 'NORMALIZED_STABLE_WITH_LEGACY_CONTINGENCY' : 'REVIEW_REQUIRED',
    monitoring,
    productionStateChanged:false,
    writeOperationsEnabled:false
  };
}

export function rehearseTaxCalculationCutover(rows, options = {}) {
  const environment = String(options.environment ?? '').toLowerCase();
  const candidate = selectTaxCalculationSource(rows, {
    requestedSource:'normalized',
    environment,
    dashboardConsumer:true
  });
  const rollback = selectTaxCalculationSource(rows, {
    requestedSource:'legacy',
    environment,
    dashboardConsumer:true
  });
  const previewEnvironment = environment === 'preview';
  const cutoverReady =
    previewEnvironment &&
    candidate.eligible === true &&
    candidate.normalizedActive === true &&
    candidate.dashboardCalculationChanged === true &&
    rollback.activeSource === LEGACY_SOURCE &&
    rollback.normalizedActive === false &&
    rollback.dashboardCalculationChanged === false;

  return {
    strategy:'PRODUCTION_CUTOVER_REHEARSAL',
    featureFlag:'TAX_NORMALIZED_PRODUCTION_CANDIDATE',
    previewOnly:true,
    previewEnvironment,
    cutoverReady,
    candidate,
    rollback:{
      requestedSource:rollback.requestedSource,
      activeSource:rollback.activeSource,
      normalizedActive:rollback.normalizedActive,
      dashboardCalculationChanged:rollback.dashboardCalculationChanged,
      restored:rollback.activeSource === LEGACY_SOURCE
    },
    productionCalculationChanged:false,
    writeOperationsEnabled:false
  };
}

export function assessTaxProductionReadiness(rows, options = {}) {
  const rehearsal = rehearseTaxCalculationCutover(rows, options);
  const ready = rehearsal.cutoverReady === true;

  return {
    strategy:'PRODUCTION_READINESS_GATE',
    featureFlag:'TAX_NORMALIZED_PRODUCTION_CANDIDATE',
    decision:ready ? 'GO_AWAITING_MANUAL_APPROVAL' : 'NO_GO',
    ready,
    manualApprovalRequired:true,
    productionPromotionAuthorized:false,
    candidateSource:rehearsal.candidate.activeSource,
    rollbackSource:rehearsal.rollback.activeSource,
    rollbackVerified:rehearsal.rollback.restored === true,
    eventCount:rehearsal.candidate.eventCount,
    selectedTotal:rehearsal.candidate.selectedTotal,
    totalDifference:rehearsal.candidate.totalDifference,
    divergences:rehearsal.candidate.divergences,
    previewEnvironment:rehearsal.previewEnvironment,
    productionCalculationChanged:false,
    writeOperationsEnabled:false
  };
}
