'use strict';

const CALIBRATION_CLASSES = Object.freeze({
  ETF_BROAD: 'ETF_BROAD',
  QUALITY: 'QUALITY',
  GROWTH: 'GROWTH',
  CYBER: 'CYBER',
  INDUSTRIAL: 'INDUSTRIAL',
  CYCLICAL: 'CYCLICAL',
  HIGH_BETA: 'HIGH_BETA',
  HEALTHCARE_GROWTH: 'HEALTHCARE_GROWTH',
  TACTICAL: 'TACTICAL',
  CASH: 'CASH'
});

const ENTRY_CALIBRATIONS = Object.freeze({
  ETF_BROAD: Object.freeze({
    spikeReturn1d: 0.04,
    spikeReturn5d: 0.08,
    extendedReturn5d: 0.04,
    extendedReturn20d: 0.08,
    pullbackReturn5d: -0.04,
    pullbackReturn20d: -0.07,
    abnormalGapPct: 0.03,
    spikeVolatilityMultiple: 2.5,
    extendedVolatilityMultiple: 1.5,
    pullbackVolatilityMultiple: -1.5,
    spikeVolumeRatio: 1.5
  }),

  QUALITY: Object.freeze({
    spikeReturn1d: 0.05,
    spikeReturn5d: 0.10,
    extendedReturn5d: 0.05,
    extendedReturn20d: 0.10,
    pullbackReturn5d: -0.05,
    pullbackReturn20d: -0.08,
    abnormalGapPct: 0.035,
    spikeVolatilityMultiple: 2.5,
    extendedVolatilityMultiple: 1.5,
    pullbackVolatilityMultiple: -1.5,
    spikeVolumeRatio: 1.5
  }),

  GROWTH: Object.freeze({
    spikeReturn1d: 0.07,
    spikeReturn5d: 0.14,
    extendedReturn5d: 0.07,
    extendedReturn20d: 0.14,
    pullbackReturn5d: -0.07,
    pullbackReturn20d: -0.12,
    abnormalGapPct: 0.05,
    spikeVolatilityMultiple: 2.75,
    extendedVolatilityMultiple: 1.75,
    pullbackVolatilityMultiple: -1.75,
    spikeVolumeRatio: 1.5
  }),

  CYBER: Object.freeze({
    spikeReturn1d: 0.06,
    spikeReturn5d: 0.12,
    extendedReturn5d: 0.06,
    extendedReturn20d: 0.12,
    pullbackReturn5d: -0.06,
    pullbackReturn20d: -0.10,
    abnormalGapPct: 0.045,
    spikeVolatilityMultiple: 2.75,
    extendedVolatilityMultiple: 1.75,
    pullbackVolatilityMultiple: -1.75,
    spikeVolumeRatio: 1.5
  }),

  INDUSTRIAL: Object.freeze({
    spikeReturn1d: 0.06,
    spikeReturn5d: 0.12,
    extendedReturn5d: 0.06,
    extendedReturn20d: 0.12,
    pullbackReturn5d: -0.06,
    pullbackReturn20d: -0.10,
    abnormalGapPct: 0.04,
    spikeVolatilityMultiple: 2.5,
    extendedVolatilityMultiple: 1.5,
    pullbackVolatilityMultiple: -1.5,
    spikeVolumeRatio: 1.5
  }),

  CYCLICAL: Object.freeze({
    spikeReturn1d: 0.07,
    spikeReturn5d: 0.14,
    extendedReturn5d: 0.07,
    extendedReturn20d: 0.14,
    pullbackReturn5d: -0.07,
    pullbackReturn20d: -0.12,
    abnormalGapPct: 0.05,
    spikeVolatilityMultiple: 2.75,
    extendedVolatilityMultiple: 1.75,
    pullbackVolatilityMultiple: -1.75,
    spikeVolumeRatio: 1.5
  }),

  HIGH_BETA: Object.freeze({
    spikeReturn1d: 0.08,
    spikeReturn5d: 0.16,
    extendedReturn5d: 0.08,
    extendedReturn20d: 0.16,
    pullbackReturn5d: -0.08,
    pullbackReturn20d: -0.14,
    abnormalGapPct: 0.06,
    spikeVolatilityMultiple: 3.0,
    extendedVolatilityMultiple: 2.0,
    pullbackVolatilityMultiple: -2.0,
    spikeVolumeRatio: 1.5
  }),

  HEALTHCARE_GROWTH: Object.freeze({
    spikeReturn1d: 0.07,
    spikeReturn5d: 0.14,
    extendedReturn5d: 0.07,
    extendedReturn20d: 0.14,
    pullbackReturn5d: -0.07,
    pullbackReturn20d: -0.12,
    abnormalGapPct: 0.05,
    spikeVolatilityMultiple: 2.75,
    extendedVolatilityMultiple: 1.75,
    pullbackVolatilityMultiple: -1.75,
    spikeVolumeRatio: 1.5
  }),

  TACTICAL: Object.freeze({
    observationalOnly: true
  }),

  CASH: Object.freeze({
    excluded: true
  })
});

const NCI_ASSET_CALIBRATION = Object.freeze({
  VOO: 'ETF_BROAD',
  SCHD: 'ETF_BROAD',
  QQQ: 'ETF_BROAD',

  'BRK-B': 'QUALITY',
  'BRK.B': 'QUALITY',
  COST: 'QUALITY',
  V: 'QUALITY',
  SPGI: 'QUALITY',
  RELX: 'QUALITY',
  MSI: 'QUALITY',
  RACE: 'QUALITY',

  MSFT: 'GROWTH',
  NVDA: 'GROWTH',
  MELI: 'GROWTH',
  RBRK: 'GROWTH',

  CIBR: 'CYBER',

  PWR: 'INDUSTRIAL',
  DE: 'INDUSTRIAL',

  FCX: 'CYCLICAL',
  XOM: 'CYCLICAL',

  URA: 'HIGH_BETA',
  SHLD: 'HIGH_BETA',

  ISRG: 'HEALTHCARE_GROWTH',
  LLY: 'HEALTHCARE_GROWTH',

  INTR: 'TACTICAL',
  TFLO: 'CASH'
});

function getCalibrationClass(ticker) {
  const key = String(ticker || '').trim().toUpperCase();
  return NCI_ASSET_CALIBRATION[key] || null;
}

function getEntryCalibration(calibrationClass) {
  if (!calibrationClass) return null;
  return ENTRY_CALIBRATIONS[calibrationClass] || null;
}

module.exports = {
  CALIBRATION_CLASSES,
  ENTRY_CALIBRATIONS,
  NCI_ASSET_CALIBRATION,
  getCalibrationClass,
  getEntryCalibration
};
