import { compareTaxShadowRows } from './tax-shadow-comparison.js';

const LEGACY_SOURCE = 'LEGACY_METADATA_RAW_VALUE';
const NORMALIZED_SOURCE = 'NORMALIZED_SINGLE_TAX_CASH_EFFECT';

export function selectTaxCalculationSource(rows, options = {}) {
  const requestedSource = String(options.requestedSource ?? 'legacy').toLowerCase();
  const environment = String(options.environment ?? '').toLowerCase();
  const normalizedRequested = requestedSource === 'normalized';
  const previewEnvironment = environment === 'preview';
  const comparison = compareTaxShadowRows(rows);
  const eligible = comparison.equivalent === true && comparison.divergences.length === 0;
  const normalizedActive = normalizedRequested && previewEnvironment && eligible;
  const dashboardConsumer = options.dashboardConsumer === true;

  return {
    requestedSource:normalizedRequested ? NORMALIZED_SOURCE : LEGACY_SOURCE,
    activeSource:normalizedActive ? NORMALIZED_SOURCE : LEGACY_SOURCE,
    normalizedActive,
    previewOnly:true,
    previewEnvironment,
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
