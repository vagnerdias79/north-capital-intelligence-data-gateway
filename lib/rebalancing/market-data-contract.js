'use strict';

const EVENT_STATES = Object.freeze([
  'NONE',
  'MATERIAL',
  'THESIS_REVIEW'
]);

function finiteNumber(value, field) {
  const n = Number(value);

  if (!Number.isFinite(n)) {
    throw new Error(`INVALID_MARKET_DATA:${field}`);
  }

  return n;
}

function optionalString(value) {
  if (value == null || value === '') return null;
  return String(value);
}

function normalizeEventState(value) {
  const state = String(value || 'NONE')
    .trim()
    .toUpperCase();

  if (!EVENT_STATES.includes(state)) {
    throw new Error(`INVALID_MARKET_DATA:eventState:${state}`);
  }

  return state;
}

function normalizeMarketDataSnapshot(input = {}) {
  if (!input.ticker) {
    throw new Error('INVALID_MARKET_DATA:ticker');
  }

  const ticker = String(input.ticker)
    .trim()
    .toUpperCase();

  const price = finiteNumber(input.price, 'price');

  if (price <= 0) {
    throw new Error('INVALID_MARKET_DATA:price');
  }

  return {
    ticker,
    asOf: optionalString(input.asOf),
    currency: optionalString(input.currency),

    price,

    return1d: finiteNumber(input.return1d, 'return1d'),
    return5d: finiteNumber(input.return5d, 'return5d'),
    return20d: finiteNumber(input.return20d, 'return20d'),
    return60d: finiteNumber(input.return60d, 'return60d'),

    volatility20d: finiteNumber(
      input.volatility20d,
      'volatility20d'
    ),

    gapPct: finiteNumber(
      input.gapPct,
      'gapPct'
    ),

    volumeRatio: finiteNumber(
      input.volumeRatio,
      'volumeRatio'
    ),

    eventState: normalizeEventState(
      input.eventState
    ),

    thesisValid:
      input.thesisValid !== false,

    source: optionalString(input.source),
    sourceTimestamp:
      optionalString(input.sourceTimestamp)
  };
}

function validateMarketDataSnapshot(input = {}) {
  try {
    const snapshot =
      normalizeMarketDataSnapshot(input);

    return {
      valid: true,
      snapshot,
      error: null
    };
  } catch (error) {
    return {
      valid: false,
      snapshot: null,
      error: error.message
    };
  }
}

module.exports = {
  EVENT_STATES,
  normalizeMarketDataSnapshot,
  validateMarketDataSnapshot
};
