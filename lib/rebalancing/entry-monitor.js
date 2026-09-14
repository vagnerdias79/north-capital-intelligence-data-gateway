'use strict';

const {
  normalizeMarketDataSnapshot
} = require('./market-data-contract');

const {
  getCalibrationClass,
  getEntryCalibration
} = require('./entry-calibration');

/*
 * NCI Entry Monitor v1
 *
 * Responsibility:
 * Translate market behavior into one of:
 *
 * NORMAL
 * PULLBACK
 * EXTENDED
 * SPIKE
 * THESIS_EVENT
 *
 * It does NOT:
 * - allocate capital
 * - create trades
 * - change portfolio weights
 * - judge thesis validity
 *
 * All returns/percentages are decimal:
 * 0.05 = +5%
 * -0.10 = -10%
 */

const DEFAULT_ENTRY_MONITOR_CONFIG = Object.freeze({
  // Abnormal upside move
  spikeReturn1d: 0.08,
  spikeReturn5d: 0.15,
  spikeVolatilityMultiple: 2.5,
  spikeVolumeRatio: 1.5,

  // Price extended, but not necessarily a spike
  extendedReturn5d: 0.08,
  extendedReturn20d: 0.15,
  extendedVolatilityMultiple: 1.5,

  // Healthy correction / potential entry window
  pullbackReturn5d: -0.08,
  pullbackReturn20d: -0.12,
  pullbackVolatilityMultiple: -1.5,

  // Gap awareness
  abnormalGapPct: 0.05
});

function finite(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function mergeConfig(config = {}, market = {}) {
  const explicitClass =
    config.calibrationClass ||
    market.calibrationClass ||
    null;

  const inferredClass =
    explicitClass ||
    getCalibrationClass(market.ticker);

  const classConfig =
    getEntryCalibration(inferredClass);

  const usableClassConfig =
    classConfig &&
    !classConfig.observationalOnly &&
    !classConfig.excluded
      ? classConfig
      : null;

  return {
    ...DEFAULT_ENTRY_MONITOR_CONFIG,
    ...(usableClassConfig || {}),
    ...config,
    calibrationClass:
      inferredClass || null
  };
}

function volatilityAdjustedMove(returnValue, volatility, days) {
  const r = finite(returnValue);
  const vol = finite(volatility);

  if (vol <= 0 || days <= 0) return 0;

  return r / (vol * Math.sqrt(days));
}

function evaluateEntryMonitor(market = {}, config = {}) {
  const cfg = mergeConfig(config, market);

  const return1d = finite(market.return1d);
  const return5d = finite(market.return5d);
  const return20d = finite(market.return20d);
  const return60d = finite(market.return60d);

  const volatility20d = finite(market.volatility20d);
  const gapPct = finite(market.gapPct);
  const volumeRatio = finite(market.volumeRatio, 1);

  const eventState = String(
    market.eventState || 'NONE'
  ).trim().toUpperCase();

  const thesisValid =
    market.thesisValid !== false;

  const z1 = volatilityAdjustedMove(
    return1d,
    volatility20d,
    1
  );

  const z5 = volatilityAdjustedMove(
    return5d,
    volatility20d,
    5
  );

  /*
   * 1. Fundamental/event precedence.
   *
   * The Entry Monitor does not decide whether the thesis
   * is broken. It only tells the eligibility layer that
   * a material event requires review.
   */
  if (
    !thesisValid ||
    eventState === 'MATERIAL' ||
    eventState === 'THESIS_REVIEW'
  ) {
    return result('THESIS_EVENT', {
      reason: 'Material event requires thesis validation',
      return1d,
      return5d,
      return20d,
      return60d,
      volatility20d,
      gapPct,
      volumeRatio,
      z1,
      z5,
      eventState
    });
  }

  /*
   * 2. SPIKE
   *
   * Strong short-term acceleration.
   * Volume confirmation is useful, but a very large move
   * can trigger SPIKE even without volume data.
   */
  const spikeBy1d =
    return1d >= cfg.spikeReturn1d ||
    z1 >= cfg.spikeVolatilityMultiple;

  const spikeBy5d =
    return5d >= cfg.spikeReturn5d ||
    z5 >= cfg.spikeVolatilityMultiple;

  const abnormalGap =
    gapPct >= cfg.abnormalGapPct;

  const volumeState =
    String(market.volumeState || 'COMPLETE')
      .trim()
      .toUpperCase();

  const volumeComplete =
    volumeState === 'COMPLETE';

  const volumeConfirmed =
    volumeComplete &&
    volumeRatio >= cfg.spikeVolumeRatio;

  if (
    spikeBy1d ||
    spikeBy5d ||
    (abnormalGap && volumeConfirmed)
  ) {
    return result('SPIKE', {
      reason: 'Abnormal upside acceleration detected',
      return1d,
      return5d,
      return20d,
      return60d,
      volatility20d,
      gapPct,
      volumeRatio,
      z1,
      z5,
      spikeBy1d,
      spikeBy5d,
      abnormalGap,
      volumeState,
      volumeComplete,
      volumeConfirmed
    });
  }

  /*
   * 3. EXTENDED
   *
   * Price is stretched enough that NCI should wait
   * for a better entry rather than chase.
   */
  const extended =
    return5d >= cfg.extendedReturn5d ||
    return20d >= cfg.extendedReturn20d ||
    z5 >= cfg.extendedVolatilityMultiple;

  if (extended) {
    return result('EXTENDED', {
      reason: 'Price is extended relative to recent behavior',
      return1d,
      return5d,
      return20d,
      return60d,
      volatility20d,
      gapPct,
      volumeRatio,
      z1,
      z5
    });
  }

  /*
   * 4. PULLBACK
   *
   * A meaningful correction while thesis remains valid.
   * This is NOT an automatic buy signal.
   * It only makes the asset eligible for timing preference.
   */
  const pullback =
    return5d <= cfg.pullbackReturn5d ||
    return20d <= cfg.pullbackReturn20d ||
    z5 <= cfg.pullbackVolatilityMultiple;

  if (pullback) {
    return result('PULLBACK', {
      reason: 'Meaningful correction with thesis still valid',
      return1d,
      return5d,
      return20d,
      return60d,
      volatility20d,
      gapPct,
      volumeRatio,
      z1,
      z5
    });
  }

  return result('NORMAL', {
    reason: 'No abnormal entry condition detected',
    return1d,
    return5d,
    return20d,
    return60d,
    volatility20d,
    gapPct,
    volumeRatio,
    z1,
    z5
  });
}

function result(state, details) {
  return {
    state,
    ...details
  };
}

function evaluateEntryMonitorFromSnapshot(snapshot, config = {}) {
  const market = normalizeMarketDataSnapshot(snapshot);

  const entry = evaluateEntryMonitor(market, config);

  return {
    ticker: market.ticker,
    asOf: market.asOf,
    currency: market.currency,
    price: market.price,
    source: market.source,
    sourceTimestamp: market.sourceTimestamp,
    ...entry
  };
}

module.exports = {
  DEFAULT_ENTRY_MONITOR_CONFIG,
  volatilityAdjustedMove,
  evaluateEntryMonitor,
  evaluateEntryMonitorFromSnapshot
};
