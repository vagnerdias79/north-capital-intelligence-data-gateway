'use strict';

const {
  normalizeMarketDataSnapshot
} = require('./market-data-contract');

function quoteToMarketSnapshot(
  quote,
  {
    eventState = 'NONE',
    thesisValid = true,
    asOf = null
  } = {}
) {
  if (!quote || quote.ok === false) {
    throw new Error('INVALID_MARKET_QUOTE');
  }

  return normalizeMarketDataSnapshot({
    ticker: quote.ticker,
    asOf,
    currency: quote.currency,
    price: quote.price,

    return1d: quote.return1d,
    return5d: quote.return5d,
    return20d: quote.return20d,
    return60d: quote.return60d,

    volatility20d: quote.volatility20d,
    gapPct: quote.gapPct,
    volumeRatio: quote.volumeRatio,

    eventState,
    thesisValid,

    source: quote.source,
    sourceTimestamp: quote.sourceTimestamp
  });
}

module.exports = {
  quoteToMarketSnapshot
};
