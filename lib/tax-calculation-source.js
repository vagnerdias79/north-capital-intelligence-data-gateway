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
    dashboardCalculationChanged:false,
    writeOperationsEnabled:false
  };
}
